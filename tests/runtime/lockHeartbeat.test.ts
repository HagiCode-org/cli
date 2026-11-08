import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { ErrorDetailSchema } from '../../src/generated/grpc/hagicode/common/v1/error_detail_pb';
import type { LockStatusDto } from '../../src/runtime/hagiApi';
import { runLockHeartbeat, type HeartbeatEvent } from '../../src/runtime/lockHeartbeat';
import { createLockStatus, fakeWaitClock } from '../commands/testHelpers';

const BASE = Date.parse('2026-11-07T10:00:00.000Z');
const MINUTE = 60_000;

/** A backend whose clock follows the fake clock: a 10-minute lease and a 24-hour cap counted from the grant at `BASE`. */
function backend(clock: { now: () => number }, overrides: Partial<LockStatusDto> = {}) {
  const status = (): LockStatusDto => {
    const now = BASE + clock.now();
    return createLockStatus({
      epoch: 5,
      serverTime: new Date(now).toISOString(),
      leaseExpiresAt: new Date(now + 10 * MINUTE).toISOString(),
      maxHoldExpiresAt: new Date(BASE + 24 * 60 * MINUTE).toISOString(),
      ...overrides,
    });
  };
  return { status };
}

function setup(options: { stopAfterBeats?: number } = {}) {
  const clock = fakeWaitClock();
  const controller = new AbortController();
  const events: HeartbeatEvent[] = [];
  const server = backend(clock);
  let beats = 0;
  const renewLock = vi.fn(async (..._args: unknown[]) => {
    beats += 1;
    if (options.stopAfterBeats !== undefined && beats >= options.stopAfterBeats) {
      controller.abort();
    }
    return server.status();
  });
  const getLockStatus = vi.fn(async (..._args: unknown[]) => server.status());
  const releaseLock = vi.fn();
  const api = { renewLock, getLockStatus, releaseLock };
  const run = (extra: Partial<Parameters<typeof runLockHeartbeat>[0]> = {}) =>
    runLockHeartbeat({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      epoch: 5,
      api,
      clock,
      signal: controller.signal,
      emit: event => events.push(event),
      ...extra,
    });

  return { clock, controller, events, renewLock, getLockStatus, releaseLock, run, server };
}

const failedPrecondition = (message: string, code?: string) =>
  new ConnectError(message, Code.FailedPrecondition, undefined, code ? [{ desc: ErrorDetailSchema, value: { code } }] : undefined);

describe('runLockHeartbeat', () => {
  it('beats at once, prints one start line, and stays silent over many beats', async () => {
    const test = setup({ stopAfterBeats: 60 });

    const result = await test.run();

    expect(result).toMatchObject({ outcome: 'stopped', beats: 60 });
    expect(test.events.map(event => event.kind)).toEqual(['started']);
    expect(test.events[0].message).toContain('renewing every 120s');
    expect(test.renewLock).toHaveBeenCalledTimes(60);
    // The first beat is immediate; the rest are one interval apart (the server suggests 120 s).
    expect(test.clock.sleep.mock.calls.map(call => call[0]).slice(0, 3)).toEqual([120_000, 120_000, 120_000]);
  });

  it('uses --interval over the suggested interval, and passes epoch and lease length on', async () => {
    const test = setup({ stopAfterBeats: 3 });

    await test.run({ intervalSeconds: 30, leaseSeconds: 90 });

    expect(test.clock.sleep.mock.calls[0][0]).toBe(30_000);
    expect(test.renewLock.mock.calls[0][0]).toEqual({ lockId: 'eu-1/duckov', ownerId: 'sess-a', epoch: 5, leaseSeconds: 90 });
  });

  it('prints one line per beat only with verbose', async () => {
    const test = setup({ stopAfterBeats: 4 });

    await test.run({ verbose: true });

    expect(test.events.map(event => event.kind)).toEqual(['started', 'beat', 'beat', 'beat']);
  });

  it('reports a lost lock with a reason line, and does not beat again', async () => {
    const test = setup();
    test.renewLock.mockRejectedValueOnce(new ConnectError('x', Code.Unavailable));
    test.renewLock.mockImplementationOnce(async () => test.server.status());
    test.renewLock.mockRejectedValueOnce(failedPrecondition('Lease expired.', 'PCode.Lock.NotHolder'));

    const result = await test.run();

    expect(result.outcome).toBe('lost');
    const lost = test.events.at(-1)!;
    expect(lost).toMatchObject({ kind: 'lost', errorCode: 'PCode.Lock.NotHolder' });
    expect(lost.message).toContain('Lease expired.');
    expect(lost.message).toContain('Stop using the resource now.');
    expect(test.releaseLock).not.toHaveBeenCalled();
  });

  it('prints requester, time and reason of a requisition answer and says to stop', async () => {
    const test = setup();
    const message =
      'Lock eu-1/duckov was requisitioned by sess-d at 2026-11-07T10:05:00Z: user ordered a forced take. Stop using the resource at once.';
    test.renewLock.mockRejectedValueOnce(failedPrecondition(message, 'PCode.Lock.Requisitioned'));

    const result = await test.run();

    expect(result.outcome).toBe('lost');
    const lost = test.events.at(-1)!;
    expect(lost.errorCode).toBe('PCode.Lock.Requisitioned');
    expect(lost.message).toContain('sess-d');
    expect(lost.message).toContain('2026-11-07T10:05:00Z');
    expect(lost.message).toContain('user ordered a forced take');
    expect(lost.message).toMatch(/stop using the resource/i);
    expect(test.events.filter(event => event.kind === 'lost')).toHaveLength(1);
  });

  it('reads a Requisitioned status answer as a loss too', async () => {
    const test = setup();
    test.renewLock.mockResolvedValueOnce(
      createLockStatus({
        status: 'Requisitioned',
        requisition: { byOwnerId: 'sess-d', reason: 'urgent', at: '2026-11-07T10:05:00.000Z' },
      }),
    );

    const result = await test.run();

    expect(result.outcome).toBe('lost');
    expect(result.message).toMatch(/requisitioned by sess-d at 2026-11-07T10:05:00.000Z, reason: urgent/);
  });

  it('warns once after 60 s of outage, once on recovery, and not about short outages', async () => {
    const test = setup({ stopAfterBeats: 4 });
    let outageUntil = Number.NEGATIVE_INFINITY;
    let calls = 0;
    const original = test.renewLock.getMockImplementation()!;
    test.renewLock.mockImplementation(async (...args: unknown[]) => {
      calls += 1;
      if (calls === 2) {
        outageUntil = test.clock.now() + 90_000; // a 90 s outage starting at the second beat
      }
      if (test.clock.now() < outageUntil) {
        throw new ConnectError('down', Code.Unavailable);
      }
      return original(...args);
    });

    const result = await test.run();

    expect(result.outcome).toBe('stopped');
    expect(test.events.map(event => event.kind)).toEqual(['started', 'outage', 'recovered']);
    expect(test.events[1].message).toMatch(/unreachable for (6\d|7\d|8\d)s/);
  });

  it('says the lock may already be lost when the last lease deadline passes during an outage', async () => {
    const test = setup();
    let calls = 0;
    const original = test.renewLock.getMockImplementation()!;
    test.renewLock.mockImplementation(async (...args: unknown[]) => {
      calls += 1;
      if (calls >= 2 && calls < 200) {
        throw new ConnectError('down', Code.Unavailable);
      }
      if (calls >= 200) {
        test.controller.abort();
      }
      return original(...args);
    });

    await test.run();

    const kinds = test.events.map(event => event.kind);
    expect(kinds.slice(0, 3)).toEqual(['started', 'outage', 'maybe-lost']);
    expect(kinds.filter(kind => kind === 'maybe-lost')).toHaveLength(1);
    expect(test.events[2].message).toContain('may already be lost');
  });

  it('warns 30 minutes and 5 minutes before the 24-hour cap, then reports the loss at the cap', async () => {
    const test = setup();
    const original = test.renewLock.getMockImplementation()!;
    test.renewLock.mockImplementation(async (...args: unknown[]) => {
      if (BASE + test.clock.now() >= BASE + 24 * 60 * MINUTE) {
        throw failedPrecondition('The maximum hold time has passed.');
      }
      return original(...args);
    });
    const warnedAt: number[] = [];
    const emit = test.run;

    const result = await emit({
      emit: event => {
        test.events.push(event);
        if (event.kind === 'cap-warning') {
          warnedAt.push(24 * 60 * MINUTE - test.clock.now());
        }
      },
    });

    expect(result.outcome).toBe('lost');
    expect(test.events.map(event => event.kind)).toEqual(['started', 'cap-warning', 'cap-warning', 'lost']);
    // Each warning lands at its lead time, not a whole beat late.
    expect(warnedAt).toEqual([30 * MINUTE, 5 * MINUTE]);
    expect(test.events[1].message).toContain('30 minutes');
    expect(test.events[2].message).toContain('5 minutes');
  });

  it('takes the epoch from the first status read when none is given', async () => {
    const test = setup({ stopAfterBeats: 2 });

    await test.run({ epoch: undefined });

    expect(test.getLockStatus).toHaveBeenCalledOnce();
    expect(test.renewLock.mock.calls.every(call => (call[0] as { epoch: number }).epoch === 5)).toBe(true);
  });

  it('does not read status when an epoch is given', async () => {
    const test = setup({ stopAfterBeats: 2 });

    await test.run({ epoch: 9 });

    expect(test.getLockStatus).not.toHaveBeenCalled();
    expect((test.renewLock.mock.calls[0][0] as { epoch: number }).epoch).toBe(9);
  });

  it.each([
    ['Queued', createLockStatus({ status: 'Queued', position: 2 })],
    ['Expired', createLockStatus({ status: 'Expired' })],
    ['None', createLockStatus({ status: 'None' })],
  ])('refuses to start when the owner is %s, without renewing', async (_name, status) => {
    const test = setup();
    test.getLockStatus.mockResolvedValueOnce(status);

    const result = await test.run({ epoch: undefined });

    expect(result.outcome).toBe('refused');
    expect(result.message).toContain('Refusing to start');
    expect(test.renewLock).not.toHaveBeenCalled();
    expect(test.events.map(event => event.kind)).toEqual(['refused']);
  });

  it('stops on the signal with no release call and no output', async () => {
    const test = setup({ stopAfterBeats: 2 });

    const result = await test.run();

    expect(result.outcome).toBe('stopped');
    expect(test.releaseLock).not.toHaveBeenCalled();
    expect(test.events.map(event => event.kind)).toEqual(['started']);
  });

  it('stops while sleeping between beats', async () => {
    const controller = new AbortController();
    const api = { renewLock: vi.fn(async () => createLockStatus()), getLockStatus: vi.fn() };
    const run = runLockHeartbeat({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      epoch: 3,
      api,
      clock: { now: () => 0, sleep: () => new Promise<void>(() => undefined) },
      signal: controller.signal,
      emit: () => undefined,
    });
    await new Promise(resolve => setTimeout(resolve, 5));
    controller.abort();

    await expect(run).resolves.toMatchObject({ outcome: 'stopped', beats: 1 });
  });

  it('throws a backend error that is neither a loss nor a transport failure', async () => {
    const test = setup();
    test.renewLock.mockRejectedValueOnce(new ConnectError('Invalid owner.', Code.InvalidArgument));

    await expect(test.run()).rejects.toThrow('Invalid owner.');
  });
});

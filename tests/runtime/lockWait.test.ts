import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import type { LockStatusDto } from '../../src/runtime/hagiApi';
import { lockRetryDelayMs, waitForLockTurn } from '../../src/runtime/lockWait';
import { createApiError, createLockStatus, fakeWaitClock } from '../commands/testHelpers';

const queued = (position: number, holder = 'sess-a') =>
  createLockStatus({ status: 'Queued', ownerId: 'sess-b', position, queueLength: 3, holder: { ownerId: holder, label: null } });

/** Answers the scripted values in order (an Error is thrown); the last one repeats. */
function script(items: Array<LockStatusDto | Error>) {
  let index = 0;
  return vi.fn(async () => {
    const item = items[Math.min(index, items.length - 1)];
    index += 1;
    if (item instanceof Error) {
      throw item;
    }
    return item;
  });
}

describe('waitForLockTurn', () => {
  it('returns holding when the turn arrives and prints one line per change', async () => {
    const clock = fakeWaitClock();
    const changes: LockStatusDto[] = [];
    const read = script([queued(2), queued(2), queued(1), createLockStatus({ ownerId: 'sess-b', epoch: 4 })]);

    const result = await waitForLockTurn({
      initial: queued(3),
      read,
      timeoutSeconds: 900,
      clock,
      onChange: status => changes.push(status),
    });

    expect(result).toMatchObject({ outcome: 'holding', polls: 4, status: { status: 'Holding', epoch: 4 } });
    expect(changes.map(status => status.position)).toEqual([2, 1]);
  });

  it('asks for a long-poll of at most 20 seconds and never past the timeout', async () => {
    const clock = fakeWaitClock();
    const read = script([queued(1)]);

    await waitForLockTurn({ initial: queued(1), read, timeoutSeconds: 30, clock });

    const waits = read.mock.calls.map(call => (call as unknown[])[0]);
    expect(waits[0]).toBe(20);
    expect(Math.max(...waits as number[])).toBeLessThanOrEqual(20);
  });

  it('times out after the timeout and reports the last status', async () => {
    const clock = fakeWaitClock();
    const result = await waitForLockTurn({ initial: queued(1), read: script([queued(1)]), timeoutSeconds: 60, clock });

    expect(result).toMatchObject({ outcome: 'timeout', status: { status: 'Queued', position: 1 } });
    expect(result.elapsedSeconds).toBe(60);
  });

  it.each(['Expired', 'None'])('reports loss on %s', async status => {
    const clock = fakeWaitClock();
    const result = await waitForLockTurn({
      initial: queued(1),
      read: script([queued(1), createLockStatus({ status, ownerId: 'sess-b' })]),
      timeoutSeconds: 900,
      clock,
    });

    expect(result).toMatchObject({ outcome: 'lost', status: { status } });
  });

  it('rides out 20 seconds of backend outage with 1 s to 10 s backoff, then continues', async () => {
    const clock = fakeWaitClock();
    const down = new ConnectError('down', Code.Unavailable);
    // Failures at t=0 (1 s), 1 (2 s), 3 (4 s), 7 (8 s), 15 (10 s); the sixth read, at 25 s, is the first after 20 s of outage.
    const read = script([down, down, down, down, down, queued(1), createLockStatus({ ownerId: 'sess-b' })]);

    const result = await waitForLockTurn({ initial: queued(1), read, timeoutSeconds: 900, clock });

    expect(result.outcome).toBe('holding');
    expect(clock.sleep.mock.calls.map(call => call[0]).slice(0, 5)).toEqual([1000, 2000, 4000, 8000, 10000]);
    expect(clock.now()).toBeGreaterThanOrEqual(20_000);
  });

  it('retries a failed connection too, and never calls it a lost lock', async () => {
    const clock = fakeWaitClock();
    const refused = new ConnectError('refused', Code.Unknown, undefined, undefined, new Error('ECONNREFUSED'));

    const result = await waitForLockTurn({
      initial: queued(1),
      read: script([refused, createLockStatus({ ownerId: 'sess-b' })]),
      timeoutSeconds: 900,
      clock,
    });

    expect(result.outcome).toBe('holding');
  });

  it('times out while the backend stays down', async () => {
    const clock = fakeWaitClock();
    const result = await waitForLockTurn({
      initial: queued(1),
      read: script([new ConnectError('down', Code.Unavailable)]),
      timeoutSeconds: 30,
      clock,
    });

    expect(result.outcome).toBe('timeout');
  });

  it('throws a backend refusal instead of retrying it', async () => {
    await expect(
      waitForLockTurn({
        initial: queued(1),
        read: script([createApiError(400, { error: 'Invalid lock ID.' })]),
        timeoutSeconds: 900,
        clock: fakeWaitClock(),
      }),
    ).rejects.toThrow('Invalid lock ID.');
  });

  it('stops at once when the cancel hook fires, mid-read or mid-sleep', async () => {
    const controller = new AbortController();
    const clock = fakeWaitClock();
    const read = vi.fn(async () => {
      controller.abort();
      throw new ConnectError('cancelled', Code.Canceled);
    });

    const result = await waitForLockTurn({ initial: queued(1), read, timeoutSeconds: 900, clock, signal: controller.signal });

    expect(result.outcome).toBe('cancelled');
    expect(read).toHaveBeenCalledOnce();

    const second = new AbortController();
    const pending = waitForLockTurn({
      initial: queued(1),
      read: script([queued(1)]),
      timeoutSeconds: 900,
      clock: { now: () => 0, sleep: () => new Promise<void>(() => undefined) },
      signal: second.signal,
    });
    second.abort();
    await expect(pending).resolves.toMatchObject({ outcome: 'cancelled' });
  });

  it('does not hammer a backend that answers at once: it sleeps the suggested poll interval', async () => {
    const clock = fakeWaitClock();
    await waitForLockTurn({ initial: queued(1), read: script([queued(1), createLockStatus()]), timeoutSeconds: 900, clock });

    expect(clock.sleep).toHaveBeenCalledWith(5000);
  });
});

describe('lockRetryDelayMs', () => {
  it('grows from 1 s and stops at 10 s', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(lockRetryDelayMs)).toEqual([1000, 2000, 4000, 8000, 10000, 10000, 10000]);
  });
});

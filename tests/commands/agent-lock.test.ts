import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { ErrorDetailSchema } from '../../src/generated/grpc/hagicode/common/v1/error_detail_pb';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createLockStatus, fakeWaitClock } from './testHelpers';

const lock = (...args: string[]) => ['node', 'hagi', 'agent', 'lock', ...args];
const withOwner = ['--lock-id', 'eu-1/duckov', '--owner', 'sess-a'];

const queued = (position: number) =>
  createLockStatus({
    status: 'Queued',
    position,
    queueLength: 3,
    holder: { ownerId: 'sess-x', label: 'deploy' },
    checkInWindow: { earliestAt: '2026-11-07T10:00:05.000Z', latestAt: '2026-11-07T10:01:00.000Z' },
    turnWindow: { earliestAt: '2026-11-07T10:00:00.000Z', latestAt: '2026-11-09T10:00:00.000Z' },
  });

function setup(api: Parameters<typeof createDependencies>[0] = {}) {
  const made = createDependencies(api);
  const clock = fakeWaitClock();
  let interrupt: (() => void) | undefined;
  made.dependencies.now = clock.now;
  made.dependencies.sleep = clock.sleep;
  made.dependencies.onInterrupt = handler => {
    interrupt = handler;
    return () => {
      interrupt = undefined;
    };
  };
  return { ...made, clock, interrupt: () => interrupt?.() };
}

const json = (stdout: string[]) => JSON.parse(stdout.join(''));

describe('hagi lock is not a top-level command', () => {
  it('rejects `hagi lock ...` as an unknown command', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(['node', 'hagi', 'lock', 'status', ...withOwner], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.getLockStatus).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock acquire (one call)', () => {
  it('takes a free lock: Holding, myTurn, epoch, valid-until, hard cap and check-in window in JSON', async () => {
    const { dependencies, api, stdout } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--json'), dependencies)).toBe(0);
    expect(api.acquireLock).toHaveBeenCalledOnce();
    expect(api.acquireLock).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', leaseSeconds: undefined, label: undefined });
    expect(json(stdout)).toMatchObject({
      status: 'Holding',
      myTurn: true,
      position: 0,
      epoch: 3,
      leaseExpiresAt: '2026-11-07T10:10:00.000Z',
      maxHoldExpiresAt: '2026-11-08T10:00:00.000Z',
      holder: { ownerId: 'sess-a' },
      suggestedPollIntervalMs: 5000,
      checkInWindow: { earliestAt: '2026-11-07T10:02:00.000Z', latestAt: '2026-11-07T10:10:00.000Z' },
      turnWindow: null,
    });
  });

  it('prints the windows, the heartbeat next step and the repeated-acquire note in human mode', async () => {
    const { dependencies, stdout } = setup();

    expect(await runCli(lock('acquire', ...withOwner), dependencies)).toBe(0);
    const text = stdout.join('');
    expect(text).toContain('Holding as sess-a (myTurn: yes)');
    expect(text).toContain('Valid until');
    expect(text).toContain('2026-11-07T10:10:00.000Z (in 10m 0s)');
    expect(text).toContain('Hard cap');
    expect(text).toContain('Check in');
    expect(text).toContain('hagi agent lock heartbeat --lock-id eu-1/duckov --owner sess-a --epoch 3');
    expect(text).toContain('first acquire is still valid');
  });

  it('queues behind a holder with exit 0, myTurn false, position and both windows', async () => {
    const { dependencies, stdout } = setup({ acquireLock: vi.fn().mockResolvedValue(queued(2)) });

    expect(await runCli(lock('acquire', ...withOwner, '--json'), dependencies)).toBe(0);
    expect(json(stdout)).toMatchObject({
      status: 'Queued',
      myTurn: false,
      position: 2,
      queueLength: 3,
      holder: { ownerId: 'sess-x', label: 'deploy' },
      checkInWindow: { latestAt: '2026-11-07T10:01:00.000Z' },
      turnWindow: { latestAt: '2026-11-09T10:00:00.000Z' },
    });
  });

  it('shows the turn window of a queued owner in human mode', async () => {
    const { dependencies, stdout } = setup({ acquireLock: vi.fn().mockResolvedValue(queued(2)) });

    expect(await runCli(lock('acquire', ...withOwner), dependencies)).toBe(0);
    const text = stdout.join('');
    expect(text).toMatch(/Position\s+2 of 3/);
    expect(text).toContain('Your turn');
    expect(text).toContain('2026-11-09T10:00:00.000Z');
    expect(text).toContain('acquire --lock-id eu-1/duckov --owner sess-a --wait');
  });

  it('joins --server and --game as the lock ID', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('acquire', '--server', 'eu-1', '--game', 'duckov', '--owner', 'sess-a'), dependencies)).toBe(0);
    expect(api.acquireLock).toHaveBeenCalledWith(expect.objectContaining({ lockId: 'eu-1/duckov' }));
  });

  it('takes the owner from HAGI_SESSION_ID and passes lease and label on', async () => {
    const { dependencies, api } = setup();
    dependencies.env = { ...dependencies.env, HAGI_SESSION_ID: 'sess-env' };

    expect(
      await runCli(lock('acquire', '--lock-id', 'eu-1/duckov', '--lease-seconds', '60', '--label', 'deploy'), dependencies),
    ).toBe(0);
    expect(api.acquireLock).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-env', leaseSeconds: 60, label: 'deploy' });
  });

  it('exits with the usage error before any network call on a conflicting address or a missing owner', async () => {
    const { dependencies, api, stderr } = setup();

    expect(await runCli(lock('acquire', '--lock-id', 'a/b', '--server', 'eu-1', '--owner', 'x'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(lock('acquire', '--lock-id', 'a/b'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--owner <session-id>');
    expect(api.acquireLock).not.toHaveBeenCalled();
  });

  it('has no force option and refuses --timeout without --wait', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--force'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(lock('acquire', ...withOwner, '--timeout', '30'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.acquireLock).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock acquire --wait', () => {
  it('exits 0 at once, without waiting or releasing, when the owner already holds the lock', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--wait'), dependencies)).toBe(0);
    expect(api.getLockStatus).not.toHaveBeenCalled();
    expect(api.releaseLock).not.toHaveBeenCalled();
  });

  it('waits for the turn: one line per change, then the Holding status and exit 0', async () => {
    const getLockStatus = vi
      .fn()
      .mockResolvedValueOnce(queued(2))
      .mockResolvedValueOnce(queued(2))
      .mockResolvedValueOnce(queued(1))
      .mockResolvedValue(createLockStatus({ epoch: 4 }));
    const { dependencies, api, stdout } = setup({ acquireLock: vi.fn().mockResolvedValue(queued(3)), getLockStatus });

    expect(await runCli(lock('acquire', ...withOwner, '--wait'), dependencies)).toBe(0);
    const text = stdout.join('');
    expect(text.match(/still queued/g)).toHaveLength(2);
    expect(text).toContain('position 2 of 3');
    expect(text).toContain('position 1 of 3');
    expect(text).toContain('Holding as sess-a (myTurn: yes)');
    expect(text).toMatch(/Epoch\s+4/);
    expect(api.releaseLock).not.toHaveBeenCalled();
    expect(getLockStatus.mock.calls[0][0]).toEqual({ lockId: 'eu-1/duckov', ownerId: 'sess-a', waitSeconds: 20 });
  });

  it('includes the wait details in JSON mode and prints no progress lines', async () => {
    const getLockStatus = vi.fn().mockResolvedValueOnce(queued(1)).mockResolvedValue(createLockStatus({ epoch: 4 }));
    const { dependencies, stdout } = setup({ acquireLock: vi.fn().mockResolvedValue(queued(2)), getLockStatus });

    expect(await runCli(lock('acquire', ...withOwner, '--wait', '--json'), dependencies)).toBe(0);
    expect(json(stdout)).toMatchObject({ status: 'Holding', myTurn: true, epoch: 4, wait: { outcome: 'holding' } });
  });

  it('times out with exit code 31, releasing the queue entry it created', async () => {
    const { dependencies, api, stdout } = setup({
      acquireLock: vi.fn().mockResolvedValue(queued(2)),
      getLockStatus: vi.fn().mockResolvedValue(queued(2)),
    });

    expect(await runCli(lock('acquire', ...withOwner, '--wait', '--timeout', '30'), dependencies)).toBe(EXIT_CODES.WAIT_TIMEOUT);
    expect(EXIT_CODES.WAIT_TIMEOUT).not.toBe(EXIT_CODES.LOCK_LOST);
    expect(api.releaseLock).toHaveBeenCalledExactlyOnceWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a' });
    expect(stdout.join('')).toContain('queue entry was released');
  });

  it('exits 32 when the backend reports the entry dropped (Expired or None)', async () => {
    for (const status of ['Expired', 'None']) {
      const { dependencies, api, stdout } = setup({
        acquireLock: vi.fn().mockResolvedValue(queued(2)),
        getLockStatus: vi.fn().mockResolvedValue(createLockStatus({ status })),
      });

      expect(await runCli(lock('acquire', ...withOwner, '--wait'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
      expect(stdout.join('')).toContain('dropped the queue entry');
      expect(api.releaseLock).not.toHaveBeenCalled();
    }
  });

  it('keeps waiting through 20 seconds of backend outage', async () => {
    const down = new ConnectError('down', Code.Unavailable);
    const getLockStatus = vi
      .fn()
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockRejectedValueOnce(down)
      .mockResolvedValue(createLockStatus());
    const { dependencies, clock } = setup({ acquireLock: vi.fn().mockResolvedValue(queued(1)), getLockStatus });

    expect(await runCli(lock('acquire', ...withOwner, '--wait'), dependencies)).toBe(0);
    expect(clock.now()).toBeGreaterThanOrEqual(20_000);
  });

  it('releases the queue entry on interrupt and exits without success', async () => {
    let trigger: () => void = () => undefined;
    const getLockStatus = vi.fn(async (_input: unknown, signal?: AbortSignal) => {
      trigger();
      expect(signal?.aborted).toBe(true);
      throw new ConnectError('cancelled', Code.Canceled);
    });
    const { dependencies, api, interrupt, stdout } = setup({ acquireLock: vi.fn().mockResolvedValue(queued(2)), getLockStatus });
    trigger = interrupt;

    const exitCode = await runCli(lock('acquire', ...withOwner, '--wait'), dependencies);

    expect(exitCode).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(api.releaseLock).toHaveBeenCalledExactlyOnceWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a' });
    expect(stdout.join('')).toContain('Interrupted');
  });

  it('never releases a lock held before the command began, even when interrupted', async () => {
    const { dependencies, api, interrupt } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--wait'), dependencies)).toBe(0);
    interrupt();
    expect(api.releaseLock).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock status', () => {
  it('shows Queued with myTurn false in JSON and passes --wait-seconds through', async () => {
    const { dependencies, api, stdout } = setup({ getLockStatus: vi.fn().mockResolvedValue(queued(1)) });

    expect(await runCli(lock('status', ...withOwner, '--wait-seconds', '15', '--json'), dependencies)).toBe(0);
    expect(api.getLockStatus).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', waitSeconds: 15 });
    expect(json(stdout)).toMatchObject({ status: 'Queued', myTurn: false });
  });

  it.each(['Expired', 'None'])('exits 0 for %s and tells the agent to stop', async status => {
    const { dependencies, stdout } = setup({ getLockStatus: vi.fn().mockResolvedValue(createLockStatus({ status })) });

    expect(await runCli(lock('status', ...withOwner), dependencies)).toBe(0);
    expect(stdout.join('')).toContain(status);
    expect(stdout.join('')).toMatch(status === 'Expired' ? /Stop using the resource/ : /no hold or queue entry/);
  });

  it('shows a Requisitioned status with who, when and why', async () => {
    const requisition = { byOwnerId: 'sess-d', reason: 'user ordered it', at: '2026-11-07T10:05:00.000Z' };
    const { dependencies, stdout } = setup({
      getLockStatus: vi.fn().mockResolvedValue(createLockStatus({ status: 'Requisitioned', requisition })),
    });

    expect(await runCli(lock('status', ...withOwner), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Requisitioned by sess-d at 2026-11-07T10:05:00.000Z, reason: user ordered it');
  });
});

describe('hagi agent lock renew', () => {
  it('renews, passes epoch and lease length, and prints the new valid-until', async () => {
    const { dependencies, api, stdout } = setup();

    expect(await runCli(lock('renew', ...withOwner, '--epoch', '3', '--lease-seconds', '120'), dependencies)).toBe(0);
    expect(api.renewLock).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', epoch: 3, leaseSeconds: 120 });
    expect(stdout.join('')).toContain('Valid until');
  });

  it('exits 32 on a failed-precondition answer and says the owner no longer holds it', async () => {
    const refused = new ConnectError('Epoch is stale.', Code.FailedPrecondition, undefined, [
      { desc: ErrorDetailSchema, value: { code: 'PCode.Lock.EpochMismatch' } },
    ]);
    const { dependencies, stderr } = setup({ renewLock: vi.fn().mockRejectedValue(refused) });

    expect(await runCli(lock('renew', ...withOwner), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
    expect(stderr.join('')).toContain('Epoch is stale.');
    expect(stderr.join('')).toContain('PCode.Lock.EpochMismatch');
  });

  it('rejects a bad epoch before any call', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('renew', ...withOwner, '--epoch', 'abc'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.renewLock).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock release', () => {
  it('releases with the epoch and reports what happened', async () => {
    const { dependencies, api, stdout } = setup();

    expect(await runCli(lock('release', ...withOwner, '--epoch', '3'), dependencies)).toBe(0);
    expect(api.releaseLock).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', epoch: 3 });
    expect(stdout.join('')).toContain('Released the lock');
    expect(stdout.join('')).toContain('now free');
  });

  it('exits 0 and says nothing was released after a loss', async () => {
    const { dependencies, stdout } = setup({
      releaseLock: vi.fn().mockResolvedValue({
        lockId: 'eu-1/duckov',
        ownerId: 'sess-a',
        released: false,
        previousStatus: 'Expired',
        holderOwnerId: 'sess-b',
      }),
    });

    expect(await runCli(lock('release', ...withOwner), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Nothing to release');
    expect(stdout.join('')).toContain('held by sess-b');
  });

  it('exits 32 when the backend refuses a stale epoch', async () => {
    const { dependencies } = setup({
      releaseLock: vi.fn().mockRejectedValue(new ConnectError('Epoch is stale.', Code.FailedPrecondition)),
    });

    expect(await runCli(lock('release', ...withOwner, '--epoch', '1'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
  });
});

describe('hagi agent lock list', () => {
  it('prints an empty result and exits 0 when nothing is busy', async () => {
    const { dependencies, stdout } = setup();

    expect(await runCli(lock('list'), dependencies)).toBe(0);
    expect(stdout.join('')).toBe('No busy locks.\n');
  });

  it('lists busy locks, filtered by --prefix', async () => {
    const summary = {
      lockId: 'eu-1/duckov',
      holderOwnerId: 'sess-a',
      holderLabel: 'deploy',
      epoch: 3,
      leaseExpiresAt: '2026-11-07T10:10:00.000Z',
      holdStartedAt: '2026-11-07T10:00:00.000Z',
      queueLength: 2,
    };
    const { dependencies, api, stdout } = setup({ listLocks: vi.fn().mockResolvedValue([summary]) });

    expect(await runCli(lock('list', '--prefix', 'eu-1/'), dependencies)).toBe(0);
    expect(api.listLocks).toHaveBeenCalledWith('eu-1/');
    expect(stdout.join('')).toMatch(/eu-1\/duckov\s+sess-a\s+deploy\s+3\s+2026-11-07T10:10:00.000Z\s+2/);

    const asJson = setup({ listLocks: vi.fn().mockResolvedValue([summary]) });
    expect(await runCli(lock('list', '--json'), asJson.dependencies)).toBe(0);
    expect(json(asJson.stdout).locks).toEqual([summary]);
  });
});

describe('hagi agent lock requisition', () => {
  const granted = createLockStatus({ epoch: 9, ownerId: 'sess-d' });

  it('requires --reason', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('requisition', ...withOwner), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(lock('requisition', ...withOwner, '--reason', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(lock('requisition', ...withOwner, '--reason', 'x'.repeat(201)), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.requisitionLock).not.toHaveBeenCalled();
  });

  it('takes the lock and prints the new epoch, valid-until and windows', async () => {
    const { dependencies, api, stdout } = setup({ requisitionLock: vi.fn().mockResolvedValue(granted) });

    expect(await runCli(lock('requisition', ...withOwner, '--reason', ' user said: take it now ', '--label', 'hotfix'), dependencies)).toBe(0);
    expect(api.requisitionLock).toHaveBeenCalledWith({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      reason: 'user said: take it now',
      label: 'hotfix',
    });
    expect(api.acquireLock).not.toHaveBeenCalled();
    const text = stdout.join('');
    expect(text).toMatch(/Epoch\s+9/);
    expect(text).toContain('Valid until');
    expect(text).toContain('Check in');
  });

  it('prints the same fields in JSON', async () => {
    const { dependencies, stdout } = setup({ requisitionLock: vi.fn().mockResolvedValue(granted) });

    expect(await runCli(lock('requisition', ...withOwner, '--reason', 'urgent', '--json'), dependencies)).toBe(0);
    expect(json(stdout)).toMatchObject({
      status: 'Holding',
      myTurn: true,
      epoch: 9,
      leaseExpiresAt: '2026-11-07T10:10:00.000Z',
      checkInWindow: { latestAt: '2026-11-07T10:10:00.000Z' },
    });
  });

  it('is the only command that requisitions', async () => {
    const { dependencies, api } = setup();

    await runCli(lock('acquire', ...withOwner), dependencies);
    await runCli(lock('acquire', ...withOwner, '--wait'), dependencies);
    await runCli(lock('status', ...withOwner), dependencies);
    await runCli(lock('renew', ...withOwner), dependencies);
    await runCli(lock('release', ...withOwner), dependencies);
    expect(api.requisitionLock).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock heartbeat', () => {
  it('wires the owner, epoch and the suggested interval, stays quiet, and stops with exit 0 without releasing', async () => {
    let beats = 0;
    let trigger: () => void = () => undefined;
    const renewLock = vi.fn(async () => {
      beats += 1;
      if (beats === 5) {
        trigger();
      }
      return createLockStatus();
    });
    const { dependencies, api, clock, interrupt, stdout, stderr } = setup({ renewLock });
    trigger = interrupt;

    expect(await runCli(lock('heartbeat', ...withOwner, '--epoch', '3'), dependencies)).toBe(0);
    expect(renewLock).toHaveBeenCalledTimes(5);
    expect(renewLock.mock.calls[0]).toEqual([
      { lockId: 'eu-1/duckov', ownerId: 'sess-a', epoch: 3, leaseSeconds: undefined },
      expect.anything(),
    ]);
    expect(clock.sleep.mock.calls[0][0]).toBe(120_000);
    expect(api.getLockStatus).not.toHaveBeenCalled();
    expect(api.releaseLock).not.toHaveBeenCalled();
    expect(stdout.join('').trim().split('\n')).toHaveLength(1);
    expect(stdout.join('')).toContain('Heartbeat started for lock eu-1/duckov as sess-a (epoch 3)');
    expect(stderr.join('')).toBe('');
  });

  it('takes the epoch from the first status read, honors --interval and prints a line per beat with --verbose', async () => {
    let beats = 0;
    let trigger: () => void = () => undefined;
    const renewLock = vi.fn(async () => {
      beats += 1;
      if (beats === 3) {
        trigger();
      }
      return createLockStatus({ epoch: 3 });
    });
    const getLockStatus = vi.fn().mockResolvedValue(createLockStatus({ epoch: 3 }));
    const { dependencies, clock, interrupt, stdout } = setup({ renewLock, getLockStatus });
    trigger = interrupt;

    expect(await runCli(lock('heartbeat', ...withOwner, '--interval', '30', '--verbose'), dependencies)).toBe(0);
    expect(getLockStatus).toHaveBeenCalledOnce();
    expect(renewLock.mock.calls[0][0]).toMatchObject({ epoch: 3 });
    expect(clock.sleep.mock.calls[0][0]).toBe(30_000);
    expect(stdout.join('').trim().split('\n')).toHaveLength(3);
  });

  it('refuses to start, with exit 32, when the owner does not hold the lock', async () => {
    const { dependencies, api, stdout } = setup({ getLockStatus: vi.fn().mockResolvedValue(queued(2)) });

    expect(await runCli(lock('heartbeat', ...withOwner), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
    expect(api.renewLock).not.toHaveBeenCalled();
    expect(stdout.join('')).toContain('Refusing to start');
  });

  it('prints the requisition reason once on stdout and exits 32', async () => {
    const message = 'Lock eu-1/duckov was requisitioned by sess-d at 2026-11-07T10:05:00Z: user ordered it. Stop using the resource at once.';
    const renewLock = vi.fn().mockRejectedValue(
      new ConnectError(message, Code.FailedPrecondition, undefined, [
        { desc: ErrorDetailSchema, value: { code: 'PCode.Lock.Requisitioned' } },
      ]),
    );
    const { dependencies, stdout, stderr } = setup({ renewLock });

    expect(await runCli(lock('heartbeat', ...withOwner, '--epoch', '3'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
    expect(stdout.join('')).toContain('sess-d');
    expect(stdout.join('')).toContain('user ordered it');
    expect(stdout.join('').trim().split('\n')).toHaveLength(1);
    expect(stderr.join('')).toBe('');
  });

  it('prints each event as one JSON line with --json', async () => {
    let trigger: () => void = () => undefined;
    const renewLock = vi.fn(async () => {
      trigger();
      return createLockStatus();
    });
    const { dependencies, interrupt, stdout } = setup({ renewLock });
    trigger = interrupt;

    expect(await runCli(lock('heartbeat', ...withOwner, '--epoch', '3', '--json'), dependencies)).toBe(0);
    const lines = stdout.join('').trim().split('\n').map(line => JSON.parse(line));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ event: 'started', lockId: 'eu-1/duckov', ownerId: 'sess-a' });
  });
});

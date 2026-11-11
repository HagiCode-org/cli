import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createLockStatus, fakeWaitClock } from './testHelpers';

const lock = (...args: string[]) => ['node', 'hagi', 'agent', 'lock', ...args];
const withOwner = ['--lock-id', 'eu-1/duckov', '--owner', 'sess-a'];

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

describe('hagi agent lock acquire: numeric flag validation', () => {
  it.each([
    ['--timeout', 'abc'],
    ['--timeout', '1.5'],
    ['--timeout', '-3'],
    ['--timeout', '0'],
  ])('rejects %s %s before any network call', async (flag, value) => {
    const { dependencies, api, stderr } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--wait', flag, value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--timeout');
    expect(api.acquireLock).not.toHaveBeenCalled();
  });

  it.each(['abc', '2.5', '0', '-1', ''])('rejects --lease-seconds "%s" before any network call', async value => {
    const { dependencies, api, stderr } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--lease-seconds', value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--lease-seconds');
    expect(api.acquireLock).not.toHaveBeenCalled();
  });

  it('explains the minimum when a flag is a whole number but too small', async () => {
    const { dependencies, stderr } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--lease-seconds', '0'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--lease-seconds must be 1 second or more.');
  });

  it('accepts a whole number padded with spaces', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--lease-seconds', ' 45 '), dependencies)).toBe(0);
    expect(api.acquireLock).toHaveBeenCalledWith(expect.objectContaining({ leaseSeconds: 45 }));
  });

  it('drops a blank --label instead of sending it', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--label', '   '), dependencies)).toBe(0);
    expect(api.acquireLock).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', leaseSeconds: undefined, label: undefined });
  });

  it('trims the --label it does send', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('acquire', ...withOwner, '--label', '  deploy  '), dependencies)).toBe(0);
    expect(api.acquireLock).toHaveBeenCalledWith(expect.objectContaining({ label: 'deploy' }));
  });
});

describe('hagi agent lock acquire: backend answers', () => {
  it('turns a failed-precondition answer into the lock-lost exit code', async () => {
    const { dependencies } = setup({
      acquireLock: vi.fn().mockRejectedValue(createApiError(409, { error: 'Owner sess-a is not allowed to take this lock.' })),
    });

    expect(await runCli(lock('acquire', ...withOwner), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
  });

  it('prints an unexpected status without --wait and still exits 0', async () => {
    const { dependencies, api, stdout } = setup({
      acquireLock: vi.fn().mockResolvedValue(createLockStatus({ status: 'Expired' })),
    });

    expect(await runCli(lock('acquire', ...withOwner, '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({ status: 'Expired', myTurn: false });
    expect(api.getLockStatus).not.toHaveBeenCalled();
    expect(api.releaseLock).not.toHaveBeenCalled();
  });

  it('exits 32 with --wait when the first answer is neither Holding nor Queued, without polling or releasing', async () => {
    const { dependencies, api, stdout } = setup({
      acquireLock: vi.fn().mockResolvedValue(createLockStatus({ status: 'None' })),
    });

    expect(await runCli(lock('acquire', ...withOwner, '--wait'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
    expect(stdout.join('')).not.toBe('');
    expect(api.getLockStatus).not.toHaveBeenCalled();
    expect(api.releaseLock).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock list: input and failures', () => {
  it('sends no prefix when --prefix is blank', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('list', '--prefix', '   '), dependencies)).toBe(0);
    expect(api.listLocks).toHaveBeenCalledWith(undefined);
  });

  it('trims the prefix it does send', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('list', '--prefix', ' eu-1/ '), dependencies)).toBe(0);
    expect(api.listLocks).toHaveBeenCalledWith('eu-1/');
  });

  it('prints an empty JSON list when nothing is busy', async () => {
    const { dependencies, stdout } = setup();

    expect(await runCli(lock('list', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ locks: [] });
  });

  it('maps a failed-precondition answer to the lock-lost exit code', async () => {
    const { dependencies } = setup({
      listLocks: vi.fn().mockRejectedValue(createApiError(409, { error: 'Not allowed.' })),
    });

    expect(await runCli(lock('list'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
  });

  it('does not call the backend for an unknown option', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('list', '--wait'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.listLocks).not.toHaveBeenCalled();
  });
});

describe('hagi agent lock heartbeat: input validation', () => {
  it.each([
    ['--epoch', 'abc'],
    ['--epoch', '1.5'],
    ['--epoch', '-2'],
    ['--interval', 'abc'],
    ['--interval', '0'],
    ['--interval', '2.5'],
    ['--lease-seconds', 'abc'],
    ['--lease-seconds', '0'],
  ])('rejects %s %s before any network call', async (flag, value) => {
    const { dependencies, api, stderr } = setup();

    expect(await runCli(lock('heartbeat', ...withOwner, flag, value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(flag);
    expect(api.getLockStatus).not.toHaveBeenCalled();
    expect(api.renewLock).not.toHaveBeenCalled();
  });

  it('needs an owner and a lock before it starts', async () => {
    const { dependencies, api } = setup();

    expect(await runCli(lock('heartbeat', '--lock-id', 'eu-1/duckov', '--epoch', '3'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(lock('heartbeat', '--owner', 'sess-a', '--epoch', '3'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.renewLock).not.toHaveBeenCalled();
  });

  it('passes --lease-seconds on every renewal', async () => {
    let beats = 0;
    let trigger: () => void = () => undefined;
    const renewLock = vi.fn(async () => {
      beats += 1;
      if (beats === 2) {
        trigger();
      }
      return createLockStatus();
    });
    const { dependencies, interrupt } = setup({ renewLock });
    trigger = interrupt;

    expect(await runCli(lock('heartbeat', ...withOwner, '--epoch', '3', '--lease-seconds', '45'), dependencies)).toBe(0);
    expect(renewLock).toHaveBeenCalledTimes(2);
    for (const call of renewLock.mock.calls as unknown as Array<[Record<string, unknown>]>) {
      expect(call[0]).toMatchObject({ lockId: 'eu-1/duckov', ownerId: 'sess-a', epoch: 3, leaseSeconds: 45 });
    }
  });

  it('honors HAGI_LOCK_OWNER over HAGI_SESSION_ID for the owner', async () => {
    let trigger: () => void = () => undefined;
    const renewLock = vi.fn(async () => {
      trigger();
      return createLockStatus();
    });
    const { dependencies, interrupt } = setup({ renewLock });
    trigger = interrupt;
    dependencies.env = { ...dependencies.env, HAGI_LOCK_OWNER: 'sess-lock', HAGI_SESSION_ID: 'sess-session' };

    expect(await runCli(lock('heartbeat', '--lock-id', 'eu-1/duckov', '--epoch', '3'), dependencies)).toBe(0);
    expect(renewLock.mock.calls[0]).toEqual([expect.objectContaining({ ownerId: 'sess-lock' }), expect.anything()]);
  });
});

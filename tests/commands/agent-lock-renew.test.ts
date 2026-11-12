import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerLockRenewCommand } from '../../src/commands/agent/lock/renew';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createLockStatus } from './testHelpers';

const renew = (...args: string[]) => ['node', 'hagi', 'agent', 'lock', 'renew', ...args];
const target = ['--lock-id', 'eu-1/duckov', '--owner', 'sess-a'];

describe('hagi agent lock renew (registerLockRenewCommand)', () => {
  it('exports the registration function the lock group calls', () => {
    expect(typeof registerLockRenewCommand).toBe('function');
  });

  it('sends undefined epoch and lease length when neither flag is given', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(renew(...target), dependencies)).toBe(0);
    expect(api.renewLock).toHaveBeenCalledWith({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      epoch: undefined,
      leaseSeconds: undefined,
    });
  });

  it('addresses the lock by --server and --game and takes the owner from HAGI_LOCK_OWNER', async () => {
    const { dependencies, api } = createDependencies();
    dependencies.env = { ...dependencies.env, HAGI_LOCK_OWNER: 'sess-env' };

    expect(await runCli(renew('--server', 'eu-1', '--game', 'duckov'), dependencies)).toBe(0);
    expect(api.renewLock).toHaveBeenCalledWith(expect.objectContaining({ lockId: 'eu-1/duckov', ownerId: 'sess-env' }));
  });

  it('prints the renewed status as JSON with --json', async () => {
    const status = createLockStatus({ epoch: 7 });
    const { dependencies, stdout } = createDependencies({ renewLock: vi.fn().mockResolvedValue(status) });

    expect(await runCli(renew(...target, '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(status);
  });

  it.each(['0', '-5', 'abc', '2.5'])('rejects --lease-seconds %s before any network call', async value => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(renew(...target, '--lease-seconds', value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--lease-seconds');
    expect(api.renewLock).not.toHaveBeenCalled();
  });

  it.each(['Expired', 'Queued', 'Requisitioned', 'None'] as const)(
    'exits with the lock-lost code when the answer is %s instead of Holding',
    async status => {
      const { dependencies, stdout } = createDependencies({
        renewLock: vi.fn().mockResolvedValue(createLockStatus({ status })),
      });

      expect(await runCli(renew(...target), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
      expect(stdout.join('')).not.toBe('');
    },
  );

  it('still prints the answer as JSON before exiting with the lock-lost code', async () => {
    const status = createLockStatus({ status: 'Expired' });
    const { dependencies, stdout } = createDependencies({ renewLock: vi.fn().mockResolvedValue(status) });

    expect(await runCli(renew(...target, '--json'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
    expect(JSON.parse(stdout.join(''))).toEqual(status);
  });

  it('does not turn an unreachable backend into the lock-lost exit code', async () => {
    const { dependencies } = createDependencies({
      renewLock: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    const exitCode = await runCli(renew(...target), dependencies);

    expect(exitCode).not.toBe(0);
    expect(exitCode).not.toBe(EXIT_CODES.LOCK_LOST);
  });
});

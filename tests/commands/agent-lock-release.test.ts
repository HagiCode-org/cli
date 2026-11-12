import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerLockReleaseCommand } from '../../src/commands/agent/lock/release';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from './testHelpers';

const release = (...args: string[]) => ['node', 'hagi', 'agent', 'lock', 'release', ...args];

describe('hagi agent lock release (registerLockReleaseCommand)', () => {
  it('exports the registration function the lock group calls', () => {
    expect(typeof registerLockReleaseCommand).toBe('function');
  });

  it('addresses the lock by --server and --game', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(release('--server', 'eu-1', '--game', 'duckov', '--owner', 'sess-a'), dependencies)).toBe(0);
    expect(api.releaseLock).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', epoch: undefined });
  });

  it('takes the owner from HAGI_LOCK_OWNER when --owner is absent', async () => {
    const { dependencies, api } = createDependencies();
    dependencies.env = { ...dependencies.env, HAGI_LOCK_OWNER: 'sess-env' };

    expect(await runCli(release('--lock-id', 'eu-1/duckov'), dependencies)).toBe(0);
    expect(api.releaseLock).toHaveBeenCalledWith(expect.objectContaining({ ownerId: 'sess-env' }));
  });

  it('accepts an epoch padded with whitespace', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(release('--lock-id', 'eu-1/duckov', '--owner', 'sess-a', '--epoch', ' 9 '), dependencies)).toBe(0);
    expect(api.releaseLock).toHaveBeenCalledWith(expect.objectContaining({ epoch: 9 }));
  });

  it('prints the backend answer as JSON with --json', async () => {
    const answer = {
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      released: true,
      previousStatus: 'Holding',
      holderOwnerId: 'sess-b',
    };
    const { dependencies, stdout } = createDependencies({ releaseLock: vi.fn().mockResolvedValue(answer) });

    expect(await runCli(release('--lock-id', 'eu-1/duckov', '--owner', 'sess-a', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(answer);
  });

  it('says the queue entry was released when the owner was only waiting', async () => {
    const { dependencies, stdout } = createDependencies({
      releaseLock: vi.fn().mockResolvedValue({
        lockId: 'eu-1/duckov',
        ownerId: 'sess-a',
        released: true,
        previousStatus: 'Waiting',
        holderOwnerId: 'sess-b',
      }),
    });

    expect(await runCli(release('--lock-id', 'eu-1/duckov', '--owner', 'sess-a'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Released the queue entry of owner sess-a');
    expect(stdout.join('')).toContain('held by sess-b');
  });

  it.each(['abc', '-1', '1.5'])('rejects --epoch %s before any network call', async epoch => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(release('--lock-id', 'eu-1/duckov', '--owner', 'sess-a', '--epoch', epoch), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--epoch');
    expect(api.releaseLock).not.toHaveBeenCalled();
  });

  it('rejects a missing lock and a missing owner before any network call', async () => {
    const noLock = createDependencies();
    expect(await runCli(release('--owner', 'sess-a'), noLock.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(noLock.api.releaseLock).not.toHaveBeenCalled();

    const noOwner = createDependencies();
    expect(await runCli(release('--lock-id', 'eu-1/duckov'), noOwner.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(noOwner.stderr.join('')).toContain('No lock owner');
    expect(noOwner.api.releaseLock).not.toHaveBeenCalled();
  });

  it('does not turn an unreachable backend into the lock-lost exit code', async () => {
    const { dependencies } = createDependencies({
      releaseLock: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    const exitCode = await runCli(release('--lock-id', 'eu-1/duckov', '--owner', 'sess-a'), dependencies);

    expect(exitCode).not.toBe(0);
    expect(exitCode).not.toBe(EXIT_CODES.LOCK_LOST);
  });
});

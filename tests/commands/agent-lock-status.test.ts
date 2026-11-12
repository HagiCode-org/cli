import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerLockStatusCommand } from '../../src/commands/agent/lock/status';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createLockStatus } from './testHelpers';

const status = (...args: string[]) => ['node', 'hagi', 'agent', 'lock', 'status', ...args];
const target = ['--lock-id', 'eu-1/duckov', '--owner', 'sess-a'];

describe('hagi agent lock status (registerLockStatusCommand)', () => {
  it('exports the registration function the lock group calls', () => {
    expect(typeof registerLockStatusCommand).toBe('function');
  });

  it('asks for the status without a long poll by default', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(status(...target), dependencies)).toBe(0);
    expect(api.getLockStatus).toHaveBeenCalledWith({ lockId: 'eu-1/duckov', ownerId: 'sess-a', waitSeconds: undefined });
  });

  it('addresses the lock by --server and --game and takes the owner from HAGI_SESSION_ID', async () => {
    const { dependencies, api } = createDependencies();
    dependencies.env = { ...dependencies.env, HAGI_SESSION_ID: 'sess-from-session' };

    expect(await runCli(status('--server', 'eu-1', '--game', 'duckov'), dependencies)).toBe(0);
    expect(api.getLockStatus).toHaveBeenCalledWith(expect.objectContaining({ lockId: 'eu-1/duckov', ownerId: 'sess-from-session' }));
  });

  it('accepts a wait of zero seconds, since a long poll of zero is allowed', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(status(...target, '--wait-seconds', '0'), dependencies)).toBe(0);
    expect(api.getLockStatus).toHaveBeenCalledWith(expect.objectContaining({ waitSeconds: 0 }));
  });

  it('passes a large wait through unchanged because the server applies the cap', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(status(...target, '--wait-seconds', '60'), dependencies)).toBe(0);
    expect(api.getLockStatus).toHaveBeenCalledWith(expect.objectContaining({ waitSeconds: 60 }));
  });

  it.each(['-1', 'abc', '1.5', ''])('rejects --wait-seconds %j before any network call', async value => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(status(...target, '--wait-seconds', value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--wait-seconds');
    expect(api.getLockStatus).not.toHaveBeenCalled();
  });

  it.each(['Holding', 'Queued', 'Expired', 'Requisitioned', 'None'] as const)('exits 0 and prints something for %s', async state => {
    const { dependencies, stdout } = createDependencies({
      getLockStatus: vi.fn().mockResolvedValue(createLockStatus({ status: state })),
    });

    expect(await runCli(status(...target), dependencies)).toBe(0);
    expect(stdout.join('')).not.toBe('');
  });

  it('prints the status as JSON with --json', async () => {
    const answer = createLockStatus({ status: 'Queued', position: 2 });
    const { dependencies, stdout } = createDependencies({ getLockStatus: vi.fn().mockResolvedValue(answer) });

    expect(await runCli(status(...target, '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(answer);
  });

  it('rejects a missing owner before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(status('--lock-id', 'eu-1/duckov'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('No lock owner');
    expect(api.getLockStatus).not.toHaveBeenCalled();
  });

  it('turns a failed-precondition answer into the lock-lost exit code', async () => {
    const { dependencies } = createDependencies({
      getLockStatus: vi.fn().mockRejectedValue(new ConnectError('Not allowed.', Code.FailedPrecondition)),
    });

    expect(await runCli(status(...target), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
  });
});

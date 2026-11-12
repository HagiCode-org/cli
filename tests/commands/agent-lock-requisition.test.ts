import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerLockRequisitionCommand } from '../../src/commands/agent/lock/requisition';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createLockStatus } from './testHelpers';

const requisition = (...args: string[]) => ['node', 'hagi', 'agent', 'lock', 'requisition', ...args];
const target = ['--lock-id', 'eu-1/duckov', '--owner', 'sess-a'];

describe('hagi agent lock requisition (registerLockRequisitionCommand)', () => {
  it('exports the registration function the lock group calls', () => {
    expect(typeof registerLockRequisitionCommand).toBe('function');
  });

  it('accepts a reason of exactly 200 characters and rejects 201', async () => {
    const ok = createDependencies();
    expect(await runCli(requisition(...target, '--reason', 'r'.repeat(200)), ok.dependencies)).toBe(0);
    expect(ok.api.requisitionLock).toHaveBeenCalledTimes(1);

    const tooLong = createDependencies();
    expect(await runCli(requisition(...target, '--reason', 'r'.repeat(201)), tooLong.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(tooLong.stderr.join('')).toContain('--reason must be 1 to 200 characters.');
    expect(tooLong.api.requisitionLock).not.toHaveBeenCalled();
  });

  it('counts the reason after trimming, so padding cannot push it over the limit', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(requisition(...target, '--reason', `  ${'r'.repeat(200)}  `), dependencies)).toBe(0);
    expect(api.requisitionLock).toHaveBeenCalledWith(expect.objectContaining({ reason: 'r'.repeat(200) }));
  });

  it('refuses a whitespace-only reason before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(requisition(...target, '--reason', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.requisitionLock).not.toHaveBeenCalled();
  });

  it('drops a blank --label and trims the one it sends', async () => {
    const blank = createDependencies();
    await runCli(requisition(...target, '--reason', 'urgent', '--label', '   '), blank.dependencies);
    expect(blank.api.requisitionLock).toHaveBeenCalledWith({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
      reason: 'urgent',
      label: undefined,
    });

    const padded = createDependencies();
    await runCli(requisition(...target, '--reason', 'urgent', '--label', '  hotfix  '), padded.dependencies);
    expect(padded.api.requisitionLock).toHaveBeenCalledWith(expect.objectContaining({ label: 'hotfix' }));
  });

  it('addresses the lock by --server and --game and takes the owner from HAGI_LOCK_OWNER', async () => {
    const { dependencies, api } = createDependencies();
    dependencies.env = { ...dependencies.env, HAGI_LOCK_OWNER: 'sess-env' };

    expect(await runCli(requisition('--server', 'eu-1', '--game', 'duckov', '--reason', 'urgent'), dependencies)).toBe(0);
    expect(api.requisitionLock).toHaveBeenCalledWith(expect.objectContaining({ lockId: 'eu-1/duckov', ownerId: 'sess-env' }));
  });

  it('checks the reason before it resolves the owner, so a bad reason never reaches the backend', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(requisition('--lock-id', 'eu-1/duckov', '--reason', ''), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--reason');
    expect(api.requisitionLock).not.toHaveBeenCalled();
  });

  it('rejects a missing owner before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(requisition('--lock-id', 'eu-1/duckov', '--reason', 'urgent'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('No lock owner');
    expect(api.requisitionLock).not.toHaveBeenCalled();
  });

  it('prints the granted status as JSON with --json', async () => {
    const granted = createLockStatus({ epoch: 9 });
    const { dependencies, stdout } = createDependencies({ requisitionLock: vi.fn().mockResolvedValue(granted) });

    expect(await runCli(requisition(...target, '--reason', 'urgent', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(granted);
  });

  it('turns a failed-precondition answer into the lock-lost exit code', async () => {
    const { dependencies } = createDependencies({
      requisitionLock: vi.fn().mockRejectedValue(new ConnectError('Not allowed.', Code.FailedPrecondition)),
    });

    expect(await runCli(requisition(...target, '--reason', 'urgent'), dependencies)).toBe(EXIT_CODES.LOCK_LOST);
  });

  it('does not turn an unreachable backend into the lock-lost exit code', async () => {
    const { dependencies } = createDependencies({
      requisitionLock: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    const exitCode = await runCli(requisition(...target, '--reason', 'urgent'), dependencies);

    expect(exitCode).not.toBe(0);
    expect(exitCode).not.toBe(EXIT_CODES.LOCK_LOST);
  });
});

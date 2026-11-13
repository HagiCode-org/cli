import { describe, expect, it, vi } from 'vitest';
import { CliUsageError } from '../../src/runtime/errors';
import { resolveLockId, resolveLockOwner, resolveSessionId } from '../../src/runtime/lockOwner';
import { runCli } from '../../src/main';
import { createDependencies } from '../commands/testHelpers';

describe('resolveSessionId', () => {
  it('lets the option win over HAGI_SESSION_ID', () => {
    expect(resolveSessionId(' s1 ', { HAGI_SESSION_ID: 's2' })).toBe('s1');
  });

  it('falls back to a trimmed HAGI_SESSION_ID', () => {
    expect(resolveSessionId(undefined, { HAGI_SESSION_ID: '  s2  ' })).toBe('s2');
  });

  it('ignores whitespace-only values in both places', () => {
    expect(() => resolveSessionId('   ', { HAGI_SESSION_ID: '  ' })).toThrow(CliUsageError);
    expect(resolveSessionId('   ', { HAGI_SESSION_ID: 's2' })).toBe('s2');
  });

  it('fails with a usage error when neither is set and does not use the lock owner variables', () => {
    expect(() => resolveSessionId(undefined, {})).toThrow(CliUsageError);
    expect(() => resolveSessionId(undefined, { HAGI_LOCK_OWNER: 'owner' })).toThrow(/--session <session-id>/);
  });
});

describe('resolveLockOwner', () => {
  it('uses the --owner flag', () => {
    expect(resolveLockOwner('sess-a', {})).toBe('sess-a');
  });

  it('falls back to HAGI_LOCK_OWNER', () => {
    expect(resolveLockOwner(undefined, { HAGI_LOCK_OWNER: 'owner-env' })).toBe('owner-env');
  });

  it('falls back to HAGI_SESSION_ID last', () => {
    expect(resolveLockOwner(undefined, { HAGI_SESSION_ID: 'sess-env' })).toBe('sess-env');
  });

  it('lets the flag win over both variables, and HAGI_LOCK_OWNER over HAGI_SESSION_ID', () => {
    const env = { HAGI_LOCK_OWNER: 'b', HAGI_SESSION_ID: 'c' };
    expect(resolveLockOwner('a', env)).toBe('a');
    expect(resolveLockOwner(undefined, env)).toBe('b');
  });

  it('ignores blank values', () => {
    expect(resolveLockOwner('  ', { HAGI_LOCK_OWNER: '', HAGI_SESSION_ID: ' sess ' })).toBe('sess');
  });

  it('fails with guidance to pass the session ID when there is no owner', () => {
    expect(() => resolveLockOwner(undefined, {})).toThrow(CliUsageError);
    expect(() => resolveLockOwner(undefined, {})).toThrow(/--owner <session-id>/);
  });
});

describe('resolveLockId', () => {
  it('takes --lock-id as given', () => {
    expect(resolveLockId({ lockId: 'eu-1/duckov' })).toBe('eu-1/duckov');
  });

  it('joins --server and --game as <server>/<game>', () => {
    expect(resolveLockId({ server: 'eu-1', game: 'duckov' })).toBe('eu-1/duckov');
  });

  it('rejects both forms together', () => {
    expect(() => resolveLockId({ lockId: 'a/b', server: 'eu-1' })).toThrow(/either --lock-id or/);
    expect(() => resolveLockId({ lockId: 'a/b', server: 'eu-1', game: 'duckov' })).toThrow(CliUsageError);
  });

  it('rejects only one of --server and --game', () => {
    expect(() => resolveLockId({ server: 'eu-1' })).toThrow(/together/);
    expect(() => resolveLockId({ game: 'duckov' })).toThrow(/together/);
  });

  it('rejects no address at all', () => {
    expect(() => resolveLockId({})).toThrow(/--lock-id/);
  });
});

describe('lock addressing and owner errors make no network call', () => {
  it.each([
    ['conflicting address forms', ['--lock-id', 'a/b', '--server', 'eu-1', '--owner', 'x']],
    ['only --server', ['--server', 'eu-1', '--owner', 'x']],
    ['no owner', ['--lock-id', 'a/b']],
  ])('%s', async (_name, args) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(['node', 'hagi', 'agent', 'lock', 'acquire', ...args], dependencies)).toBe(2);
    for (const fn of Object.values(api)) {
      expect(vi.isMockFunction(fn) ? fn.mock.calls : []).toHaveLength(0);
    }
  });
});

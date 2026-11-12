import { Code, ConnectError } from '@connectrpc/connect';
import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import {
  addLockTargetOptions,
  guardLock,
  lockClock,
  parseEpoch,
  parseWholeSeconds,
  resolveLockTarget,
} from '../../src/commands/agent/lock/options';
import { sleepForMilliseconds, type AppDependencies } from '../../src/runtime/commandContext';
import { CliLockLostError, CliUsageError } from '../../src/runtime/errors';

describe('parseWholeSeconds', () => {
  it('returns undefined when the flag was not given', () => {
    expect(parseWholeSeconds(undefined, '--timeout', 1)).toBeUndefined();
  });

  it('parses a whole number and ignores surrounding whitespace', () => {
    expect(parseWholeSeconds('45', '--timeout', 1)).toBe(45);
    expect(parseWholeSeconds('  7 ', '--timeout', 1)).toBe(7);
  });

  it('accepts a value equal to the minimum, including a minimum of zero', () => {
    expect(parseWholeSeconds('1', '--timeout', 1)).toBe(1);
    expect(parseWholeSeconds('0', '--timeout', 0)).toBe(0);
  });

  it.each(['', '   ', 'abc', '1.5', '-3', '+4', '1e3', '12s', '0x10'])('rejects %j as not a whole number', raw => {
    expect(() => parseWholeSeconds(raw, '--lease-seconds', 1)).toThrow(CliUsageError);
    expect(() => parseWholeSeconds(raw, '--lease-seconds', 1)).toThrow('--lease-seconds must be a whole number of seconds.');
  });

  it('uses the singular for a minimum of one second', () => {
    expect(() => parseWholeSeconds('0', '--timeout', 1)).toThrow('--timeout must be 1 second or more.');
  });

  it('uses the plural for any other minimum', () => {
    expect(() => parseWholeSeconds('5', '--heartbeat', 10)).toThrow('--heartbeat must be 10 seconds or more.');
    expect(() => parseWholeSeconds('0', '--heartbeat', 2)).toThrow('--heartbeat must be 2 seconds or more.');
  });
});

describe('parseEpoch', () => {
  it('returns undefined when no epoch was given', () => {
    expect(parseEpoch(undefined)).toBeUndefined();
  });

  it('parses a whole number, with or without padding', () => {
    expect(parseEpoch('3')).toBe(3);
    expect(parseEpoch(' 12 ')).toBe(12);
    expect(parseEpoch('0')).toBe(0);
  });

  it.each(['', 'abc', '-1', '2.5', '1 2'])('rejects %j with a usage error naming the flag', raw => {
    expect(() => parseEpoch(raw)).toThrow(CliUsageError);
    expect(() => parseEpoch(raw)).toThrow('--epoch must be a whole number');
  });
});

describe('guardLock', () => {
  it('passes the result of a successful call through', async () => {
    await expect(guardLock(async () => 'granted')).resolves.toBe('granted');
  });

  it('turns a FailedPrecondition answer into the lock-lost error', async () => {
    const failure = guardLock(() => Promise.reject(new ConnectError('Epoch is stale.', Code.FailedPrecondition)));

    await expect(failure).rejects.toBeInstanceOf(CliLockLostError);
    await expect(failure).rejects.toThrow('Epoch is stale.');
  });

  it('rethrows any other failure unchanged', async () => {
    const unavailable = new ConnectError('down', Code.Unavailable);
    const plain = new Error('boom');

    await expect(guardLock(() => Promise.reject(unavailable))).rejects.toBe(unavailable);
    await expect(guardLock(() => Promise.reject(plain))).rejects.toBe(plain);
  });

  it('only calls the wrapped function once', async () => {
    const call = vi.fn().mockResolvedValue(1);

    await guardLock(call);

    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe('resolveLockTarget', () => {
  it('resolves --lock-id and --owner', () => {
    expect(resolveLockTarget({ lockId: 'eu-1/duckov', owner: 'sess-a' }, {})).toEqual({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
    });
  });

  it('joins --server and --game into the lock id', () => {
    expect(resolveLockTarget({ server: 'eu-1', game: 'duckov', owner: 'sess-a' }, {})).toEqual({
      lockId: 'eu-1/duckov',
      ownerId: 'sess-a',
    });
  });

  it('falls back to HAGI_LOCK_OWNER, then HAGI_SESSION_ID, for the owner', () => {
    expect(resolveLockTarget({ lockId: 'a/b' }, { HAGI_LOCK_OWNER: 'from-lock-env', HAGI_SESSION_ID: 'from-session' }).ownerId).toBe(
      'from-lock-env',
    );
    expect(resolveLockTarget({ lockId: 'a/b' }, { HAGI_SESSION_ID: 'from-session' }).ownerId).toBe('from-session');
  });

  it('prefers the --owner flag over the environment', () => {
    expect(resolveLockTarget({ lockId: 'a/b', owner: 'flag' }, { HAGI_LOCK_OWNER: 'env' }).ownerId).toBe('flag');
  });

  it('throws a usage error when no owner can be found', () => {
    expect(() => resolveLockTarget({ lockId: 'a/b' }, {})).toThrow(CliUsageError);
    expect(() => resolveLockTarget({ lockId: 'a/b', owner: '   ' }, {})).toThrow('No lock owner');
  });

  it('throws a usage error for a bad lock address before it looks at the owner', () => {
    expect(() => resolveLockTarget({ lockId: 'a/b', server: 'eu-1', owner: 'x' }, {})).toThrow('not both');
    expect(() => resolveLockTarget({ server: 'eu-1', owner: 'x' }, {})).toThrow('must be given together');
    expect(() => resolveLockTarget({ owner: 'x' }, {})).toThrow('A lock is required');
  });
});

describe('addLockTargetOptions', () => {
  it('returns the same command so calls can be chained', () => {
    const command = new Command('probe');

    expect(addLockTargetOptions(command)).toBe(command);
  });

  it('registers the four addressing and owner options', () => {
    const command = addLockTargetOptions(new Command('probe'));

    expect(command.options.map(option => option.long)).toEqual(['--lock-id', '--server', '--game', '--owner']);
  });

  it('parses every option into the shape LockTargetOptions expects', () => {
    const command = addLockTargetOptions(new Command('probe')).exitOverride();

    command.parse(['--lock-id', 'eu-1/duckov', '--server', 's', '--game', 'g', '--owner', 'sess-a'], { from: 'user' });

    expect(command.opts()).toEqual({ lockId: 'eu-1/duckov', server: 's', game: 'g', owner: 'sess-a' });
  });
});

describe('lockClock', () => {
  it('uses the injected clock and sleep when present', async () => {
    const now = vi.fn(() => 1234);
    const sleep = vi.fn().mockResolvedValue(undefined);
    const clock = lockClock({ now, sleep } as unknown as AppDependencies);

    expect(clock.now()).toBe(1234);
    await clock.sleep(50);
    expect(sleep).toHaveBeenCalledWith(50);
  });

  it('falls back to Date.now and the real sleep', () => {
    const clock = lockClock({} as AppDependencies);

    expect(clock.now).toBe(Date.now);
    expect(clock.sleep).toBe(sleepForMilliseconds);
  });
});

import type { Command } from 'commander';
import { CliUsageError, toLockLostError } from '../../../runtime/errors';
import { resolveLockId, resolveLockOwner } from '../../../runtime/lockOwner';
import { sleepForMilliseconds, type AppDependencies } from '../../../runtime/commandContext';
import type { LockClock } from '../../../runtime/lockWait';

/** Raw addressing and owner options of every command that targets one lock. */
export type LockTargetOptions = {
  lockId?: string;
  server?: string;
  game?: string;
  owner?: string;
};

export function addLockTargetOptions(command: Command): Command {
  return command
    .option('--lock-id <id>', 'Lock to use, for example eu-1/duckov. Alternative to --server and --game.')
    .option('--server <name>', 'Server name; with --game, the lock is <server>/<game>.')
    .option('--game <name>', 'Game name; with --server, the lock is <server>/<game>.')
    .option('--owner <id>', 'Owner ID: your own session ID. Defaults to HAGI_LOCK_OWNER, then HAGI_SESSION_ID.');
}

/** Resolves the lock and the owner before any network call; a bad combination is a usage error. */
export function resolveLockTarget(options: LockTargetOptions, env: NodeJS.ProcessEnv): { lockId: string; ownerId: string } {
  return { lockId: resolveLockId(options), ownerId: resolveLockOwner(options.owner, env) };
}

export function parseWholeSeconds(raw: string | undefined, flag: string, minimum: number): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new CliUsageError(`${flag} must be a whole number of seconds.`);
  }

  const value = Number(trimmed);
  if (value < minimum) {
    throw new CliUsageError(`${flag} must be ${minimum} second${minimum === 1 ? '' : 's'} or more.`);
  }

  return value;
}

export function parseEpoch(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(raw.trim())) {
    throw new CliUsageError('--epoch must be a whole number, the epoch an acquire printed.');
  }

  return Number(raw.trim());
}

/** Runs a lock call; a backend `FailedPrecondition` becomes the lock-lost error (exit code 32). */
export async function guardLock<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toLockLostError(error) ?? error;
  }
}

export function lockClock(dependencies: AppDependencies): LockClock {
  return { now: dependencies.now ?? Date.now, sleep: dependencies.sleep ?? sleepForMilliseconds };
}

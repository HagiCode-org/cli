import { CliUsageError } from './errors';

export const LOCK_OWNER_ENV = 'HAGI_LOCK_OWNER';
export const SESSION_ID_ENV = 'HAGI_SESSION_ID';

function clean(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The owner ID of a lock command: `--owner`, else `HAGI_LOCK_OWNER`, else `HAGI_SESSION_ID`. With none of them the command
 * stops before any network call. The CLI never invents or stores an ID: a stored one would be shared by every agent on the
 * machine and merge them into one owner.
 */
export function resolveLockOwner(flag: string | undefined, env: NodeJS.ProcessEnv): string {
  const owner = clean(flag) ?? clean(env[LOCK_OWNER_ENV]) ?? clean(env[SESSION_ID_ENV]);
  if (!owner) {
    throw new CliUsageError(
      `No lock owner. Pass your own session ID as --owner <session-id>, or set ${LOCK_OWNER_ENV} (or ${SESSION_ID_ENV}). ` +
        'The CLI does not invent an owner ID.',
    );
  }

  return owner;
}

export type LockAddress = {
  lockId?: string;
  server?: string;
  game?: string;
};

/** The lock a command targets: `--lock-id`, or `--server` and `--game` joined as `<server>/<game>`. Not both forms. */
export function resolveLockId(address: LockAddress): string {
  const lockId = clean(address.lockId);
  const server = clean(address.server);
  const game = clean(address.game);

  if (lockId && (server || game)) {
    throw new CliUsageError('Use either --lock-id or the pair --server and --game, not both.');
  }

  if (lockId) {
    return lockId;
  }

  if (server && game) {
    return `${server}/${game}`;
  }

  if (server || game) {
    throw new CliUsageError('--server and --game must be given together.');
  }

  throw new CliUsageError('A lock is required: pass --lock-id <id>, or --server <name> and --game <name>.');
}

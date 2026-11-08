import type { LockStatusDto } from './hagiApi';
import { isTransientLockFailure } from './errors';

export const DEFAULT_LOCK_WAIT_TIMEOUT_SECONDS = 900;
/** Longest long-poll the CLI asks for; the server caps a single wait at 25 seconds. */
export const LOCK_LONG_POLL_SECONDS = 20;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const RETRY_FIRST_MS = 1000;
const RETRY_MAX_MS = 10_000;

export type LockClock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

/** Delay before retry number `failures` (1-based) after a transport failure: 1 s, doubling, at most 10 s. */
export function lockRetryDelayMs(failures: number): number {
  return Math.min(RETRY_FIRST_MS * 2 ** Math.max(0, failures - 1), RETRY_MAX_MS);
}

/** Sleeps `ms` on the clock, or until `signal` aborts, whichever comes first. */
export async function sleepUnlessAborted(clock: LockClock, ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await clock.sleep(ms);
    return;
  }

  if (signal.aborted) {
    return;
  }

  let onAbort: () => void = () => undefined;
  const aborted = new Promise<void>(resolve => {
    onAbort = resolve;
    signal.addEventListener('abort', onAbort, { once: true });
  });

  try {
    await Promise.race([clock.sleep(ms), aborted]);
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
}

export type LockWaitOutcome = 'holding' | 'lost' | 'timeout' | 'cancelled';

export type LockWaitResult = {
  outcome: LockWaitOutcome;
  /** The last status the backend returned (the initial one when no read succeeded). */
  status: LockStatusDto;
  polls: number;
  elapsedSeconds: number;
};

export type LockWaitArgs = {
  /** The status the first acquire returned; the queue position it shows is the baseline for progress lines. */
  initial: LockStatusDto;
  /** One `GetLockStatus` call with the long-poll wait in seconds. */
  read: (waitSeconds: number, signal?: AbortSignal) => Promise<LockStatusDto>;
  timeoutSeconds: number;
  clock: LockClock;
  /** Cancel hook: aborting ends the wait with `cancelled`; the caller decides what to release. */
  signal?: AbortSignal;
  /** Called once per change of position or holder, never for an unchanged read. */
  onChange?: (status: LockStatusDto) => void;
};

function changed(previous: LockStatusDto, next: LockStatusDto): boolean {
  return previous.position !== next.position || previous.holder?.ownerId !== next.holder?.ownerId;
}

/**
 * Waits in the queue until the owner holds the lock, the timeout passes, the backend says the entry is gone, or the caller
 * cancels. Only a backend answer other than `Holding` or `Queued` (`Expired`, `None`, ...) proves loss: a transport failure
 * or `Unavailable` is retried with a 1 s to 10 s backoff until the timeout. Any other backend error is thrown.
 */
export async function waitForLockTurn(args: LockWaitArgs): Promise<LockWaitResult> {
  const { read, clock, signal } = args;
  const startedAt = clock.now();
  const timeoutMs = args.timeoutSeconds * 1000;
  let last = args.initial;
  let polls = 0;
  let failures = 0;

  const result = (outcome: LockWaitOutcome): LockWaitResult => ({
    outcome,
    status: last,
    polls,
    elapsedSeconds: Math.round((clock.now() - startedAt) / 100) / 10,
  });

  for (;;) {
    if (signal?.aborted) {
      return result('cancelled');
    }

    const remainingMs = timeoutMs - (clock.now() - startedAt);
    if (remainingMs <= 0) {
      return result('timeout');
    }

    const waitSeconds = Math.min(LOCK_LONG_POLL_SECONDS, Math.max(1, Math.ceil(remainingMs / 1000)));
    const callStartedAt = clock.now();
    let status: LockStatusDto;

    try {
      status = await read(waitSeconds, signal);
    } catch (error) {
      if (signal?.aborted) {
        return result('cancelled');
      }

      if (!isTransientLockFailure(error)) {
        throw error;
      }

      failures += 1;
      await sleepUnlessAborted(clock, Math.min(lockRetryDelayMs(failures), remainingMs), signal);
      continue;
    }

    failures = 0;
    polls += 1;
    const previous = last;
    last = status;

    if (status.status === 'Holding') {
      return result('holding');
    }

    if (status.status !== 'Queued') {
      return result('lost');
    }

    const moved = changed(previous, status);
    if (moved) {
      args.onChange?.(status);
    }

    // A backend that answers at once (no long-poll) must not be asked again in a tight loop.
    if (!moved && clock.now() - callStartedAt < 1000) {
      const pollMs = status.suggestedPollIntervalMs > 0 ? status.suggestedPollIntervalMs : DEFAULT_POLL_INTERVAL_MS;
      await sleepUnlessAborted(clock, Math.min(pollMs, Math.max(0, timeoutMs - (clock.now() - startedAt))), signal);
    }
  }
}

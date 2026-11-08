import type { HagiApi, LockStatusDto } from './hagiApi';
import { isTransientLockFailure, toLockLostError } from './errors';
import { lockRetryDelayMs, sleepUnlessAborted, type LockClock } from './lockWait';

/** Used only when the backend does not suggest an interval. */
export const DEFAULT_HEARTBEAT_INTERVAL_SECONDS = 120;
const OUTAGE_WARNING_MS = 60_000;
/** How far before the hard cap a warning is printed, largest first. */
const CAP_WARNING_LEAD_MS = [30 * 60_000, 5 * 60_000];

export type HeartbeatEventKind =
  | 'started'
  | 'beat'
  | 'lost'
  | 'refused'
  | 'outage'
  | 'maybe-lost'
  | 'recovered'
  | 'cap-warning';

/** One line the heartbeat prints. A watcher turns each line into a notification, so only these kinds exist. */
export type HeartbeatEvent = {
  kind: HeartbeatEventKind;
  message: string;
  errorCode?: string;
};

export type HeartbeatArgs = {
  lockId: string;
  ownerId: string;
  /** The grant to keep alive. Without it, the epoch of the first status read is used, and only while the owner holds the lock. */
  epoch?: number;
  /** Seconds between beats. Defaults to the interval the backend suggests. */
  intervalSeconds?: number;
  /** Lease length asked for on every beat; the backend clamps it. */
  leaseSeconds?: number;
  /** Also print one line per successful beat. */
  verbose?: boolean;
  api: Pick<HagiApi, 'getLockStatus' | 'renewLock'>;
  clock: LockClock;
  /** Aborting stops the heartbeat. It never releases the lock. */
  signal: AbortSignal;
  emit: (event: HeartbeatEvent) => void;
};

export type HeartbeatResult = {
  /** `stopped`: signal aborted (exit 0). `lost` and `refused`: the owner does not hold the lock (exit 32). */
  outcome: 'stopped' | 'lost' | 'refused';
  /** The reason line, for `lost` and `refused`. */
  message?: string;
  beats: number;
};

const STOP_NOW = 'Stop using the resource now.';

function describeLoss(lockId: string, status: LockStatusDto): string {
  switch (status.status) {
    case 'Requisitioned': {
      const requisition = status.requisition;
      return `Lock ${lockId} LOST: requisitioned by ${requisition?.byOwnerId ?? 'another owner'}` +
        `${requisition?.at ? ` at ${requisition.at}` : ''}, reason: ${requisition?.reason ?? 'not given'}. ${STOP_NOW}`;
    }
    case 'Expired':
      return `Lock ${lockId} LOST: the lease expired or the hard cap passed. ${STOP_NOW}`;
    case 'Queued':
      return `Lock ${lockId} LOST: this owner is queued at position ${status.position}, not holding. ${STOP_NOW}`;
    default:
      return `Lock ${lockId} LOST: the backend has no hold for this owner (${status.status}). ${STOP_NOW}`;
  }
}

/** The server clock minus the local clock is unknown, so a deadline is placed on the local clock by its distance from server time. */
function localDeadline(clock: LockClock, deadline: string | null, serverTime: string | null): number | null {
  if (!deadline) {
    return null;
  }

  const target = Date.parse(deadline);
  const reference = serverTime ? Date.parse(serverTime) : Number.NaN;
  return Number.isNaN(reference) ? target : clock.now() + (target - reference);
}

/**
 * Keeps a lock alive: an immediate renew, then one per interval. It is quiet on success; every printed line is an event the
 * agent must hear about (start, loss, outage, recovery, the cap drawing near). Transport failures are retried with a 1 s to
 * 10 s backoff and never count as loss; only a backend answer does. Aborting the signal ends it without releasing the lock.
 */
export async function runLockHeartbeat(args: HeartbeatArgs): Promise<HeartbeatResult> {
  const { lockId, ownerId, api, clock, signal } = args;
  let epoch = args.epoch;
  let intervalMs = args.intervalSeconds === undefined ? undefined : args.intervalSeconds * 1000;
  let started = false;
  let beats = 0;
  let nextBeatAt = clock.now();
  let leaseDeadlineAt: number | null = null;
  let capAt: number | null = null;
  const capWarned = new Set<number>();
  let failures = 0;
  let outageStartedAt: number | null = null;
  let outageWarned = false;
  let maybeLostWarned = false;

  const emit = (kind: HeartbeatEventKind, message: string, errorCode?: string) => args.emit({ kind, message, errorCode });

  const warnAboutCap = () => {
    if (capAt === null) {
      return;
    }

    const due = CAP_WARNING_LEAD_MS.filter(lead => !capWarned.has(lead) && clock.now() >= capAt! - lead);
    if (due.length === 0) {
      return;
    }

    due.forEach(lead => capWarned.add(lead));
    const minutes = Math.min(...due) / 60_000;
    emit(
      'cap-warning',
      `Lock ${lockId}: the hard cap (${new Date(capAt).toISOString()}) is about ${minutes} minutes away. ` +
        'The lock is taken back at the cap even while heartbeating: finish and release before then.',
    );
  };

  for (;;) {
    if (signal.aborted) {
      return { outcome: 'stopped', beats };
    }

    // Sleep until the next beat or the next cap warning, whichever is first.
    let dueAt = nextBeatAt;
    if (capAt !== null) {
      for (const lead of CAP_WARNING_LEAD_MS) {
        if (!capWarned.has(lead)) {
          dueAt = Math.min(dueAt, capAt - lead);
        }
      }
    }

    if (dueAt > clock.now()) {
      await sleepUnlessAborted(clock, dueAt - clock.now(), signal);
      if (signal.aborted) {
        return { outcome: 'stopped', beats };
      }
    }

    warnAboutCap();
    if (clock.now() < nextBeatAt) {
      continue;
    }

    let status: LockStatusDto;
    try {
      if (epoch === undefined) {
        const first = await api.getLockStatus({ lockId, ownerId }, signal);
        if (first.status !== 'Holding') {
          const message = `Refusing to start: owner ${ownerId} does not hold lock ${lockId}. ${describeLoss(lockId, first)}`;
          emit('refused', message);
          return { outcome: 'refused', message, beats };
        }

        epoch = first.epoch;
      }

      status = await api.renewLock({ lockId, ownerId, epoch, leaseSeconds: args.leaseSeconds }, signal);
    } catch (error) {
      if (signal.aborted) {
        return { outcome: 'stopped', beats };
      }

      const lost = toLockLostError(error);
      if (lost) {
        const message = `Lock ${lockId} LOST: ${lost.message}${/stop using/i.test(lost.message) ? '' : ` ${STOP_NOW}`}`;
        emit('lost', message, lost.errorCode);
        return { outcome: 'lost', message, beats };
      }

      if (!isTransientLockFailure(error)) {
        throw error;
      }

      failures += 1;
      const now = clock.now();
      outageStartedAt ??= now;
      if (!outageWarned && now - outageStartedAt >= OUTAGE_WARNING_MS) {
        outageWarned = true;
        emit(
          'outage',
          `Backend unreachable for ${Math.round((now - outageStartedAt) / 1000)}s; still retrying. ` +
            'The lock is only lost when the backend says so, but it is released after the lease runs out.',
        );
      }

      if (!maybeLostWarned && leaseDeadlineAt !== null && now >= leaseDeadlineAt) {
        maybeLostWarned = true;
        emit('maybe-lost', `Lock ${lockId} may already be lost: the last known lease deadline passed during the outage.`);
      }

      nextBeatAt = clock.now() + lockRetryDelayMs(failures);
      continue;
    }

    if (status.status !== 'Holding') {
      const message = describeLoss(lockId, status);
      emit('lost', message);
      return { outcome: 'lost', message, beats };
    }

    beats += 1;
    if (outageStartedAt !== null) {
      if (outageWarned) {
        emit('recovered', `Backend reachable again after ${Math.round((clock.now() - outageStartedAt) / 1000)}s; heartbeat resumed.`);
      }

      outageStartedAt = null;
      outageWarned = false;
      maybeLostWarned = false;
    }

    failures = 0;
    leaseDeadlineAt = localDeadline(clock, status.leaseExpiresAt, status.serverTime);
    capAt = localDeadline(clock, status.maxHoldExpiresAt, status.serverTime) ?? capAt;
    intervalMs ??= (status.suggestedHeartbeatIntervalMs > 0
      ? status.suggestedHeartbeatIntervalMs
      : DEFAULT_HEARTBEAT_INTERVAL_SECONDS * 1000);

    if (!started) {
      started = true;
      emit(
        'started',
        `Heartbeat started for lock ${lockId} as ${ownerId} (epoch ${status.epoch}): renewing every ${intervalMs / 1000}s, ` +
          `valid until ${status.leaseExpiresAt ?? 'unknown'}, hard cap ${status.maxHoldExpiresAt ?? 'unknown'}. ` +
          'Quiet unless something needs you.',
      );
    } else if (args.verbose) {
      emit('beat', `Heartbeat ok: valid until ${status.leaseExpiresAt ?? 'unknown'}, hard cap ${status.maxHoldExpiresAt ?? 'unknown'}.`);
    }

    nextBeatAt = clock.now() + intervalMs;
  }
}

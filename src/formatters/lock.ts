import type { LockReleaseDto, LockStatusDto, LockSummaryDto, LockWindowDto } from '../runtime/hagiApi';
import type { LockWaitResult } from '../runtime/lockWait';
import { renderKeyValueTable, renderTable } from './table';

/** The command that produced a status, which decides the closing guidance. */
export type LockStatusSource = 'acquire' | 'status' | 'renew' | 'requisition';

function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

/** An ISO time with its distance from the server's own clock, so the agent's clock does not matter. */
function when(iso: string | null, serverTime: string | null): string | undefined {
  if (!iso) {
    return undefined;
  }

  if (!serverTime) {
    return iso;
  }

  const delta = Date.parse(iso) - Date.parse(serverTime);
  return Number.isNaN(delta) ? iso : `${iso} (${delta >= 0 ? 'in' : 'ago'} ${duration(Math.abs(delta))})`;
}

function windowText(window: LockWindowDto | null, serverTime: string | null): string | undefined {
  if (!window) {
    return undefined;
  }

  const earliest = when(window.earliestAt, serverTime);
  const latest = when(window.latestAt, serverTime);
  if (earliest && latest) {
    return `between ${earliest} and ${latest}`;
  }

  return earliest ? `from ${earliest}` : latest ? `by ${latest}` : undefined;
}

function holderText(status: LockStatusDto): string | undefined {
  return status.holder ? `${status.holder.ownerId}${status.holder.label ? ` (${status.holder.label})` : ''}` : undefined;
}

function target(status: LockStatusDto): string {
  return `--lock-id ${status.lockId} --owner ${status.ownerId}`;
}

/** Human text of one owner's lock state, with the windows and the next step the agent should take. */
export function formatLockStatusHuman(status: LockStatusDto, source: LockStatusSource = 'status'): string {
  const serverTime = status.serverTime;
  const head = `Lock ${status.lockId}: ${status.status} as ${status.ownerId} (myTurn: ${status.myTurn ? 'yes' : 'no'})`;

  if (status.status === 'Holding') {
    const table = renderKeyValueTable([
      ['Epoch', String(status.epoch)],
      ['Valid until', when(status.leaseExpiresAt, serverTime)
        ? `${when(status.leaseExpiresAt, serverTime)} unless a heartbeat renews it`
        : undefined],
      ['Hard cap', when(status.maxHoldExpiresAt, serverTime)
        ? `${when(status.maxHoldExpiresAt, serverTime)}; the lock is taken back then even with heartbeats`
        : undefined],
      ['Check in', windowText(status.checkInWindow, serverTime)],
      ['Queue length', status.queueLength > 0 ? String(status.queueLength) : undefined],
    ]);
    const lines = [
      head,
      table.trimEnd(),
      `Next: start the heartbeat watcher before any work: hagi agent lock heartbeat ${target(status)} --epoch ${status.epoch}`,
    ];

    if (source === 'acquire') {
      lines.push(
        'If you acquired this lock before, that first acquire is still valid: same epoch, the hard cap did not restart and ' +
          'the lease was not refreshed. Only the heartbeat renews the lease.',
      );
    }

    return `${lines.join('\n')}\n`;
  }

  if (status.status === 'Queued') {
    const table = renderKeyValueTable([
      ['Position', `${status.position} of ${status.queueLength}`],
      ['Held by', holderText(status)],
      ['Check in', windowText(status.checkInWindow, serverTime)],
      ['Your turn', windowText(status.turnWindow, serverTime)
        ? `${windowText(status.turnWindow, serverTime)} (a bound, usually much sooner)`
        : undefined],
      ['Poll interval', status.suggestedPollIntervalMs > 0 ? `${status.suggestedPollIntervalMs / 1000}s` : undefined],
    ]);
    return [
      head,
      table.trimEnd(),
      `Next: wait with a continuous watcher, do not sleep and re-check: hagi agent lock acquire ${target(status)} --wait`,
    ].join('\n') + '\n';
  }

  if (status.status === 'Requisitioned') {
    const requisition = status.requisition;
    return `${head}\nRequisitioned by ${requisition?.byOwnerId ?? 'another owner'}` +
      `${requisition?.at ? ` at ${requisition.at}` : ''}, reason: ${requisition?.reason ?? 'not given'}.\n` +
      'Stop using the resource now. Queue again only if your task still needs it, and never requisition it back.\n';
  }

  if (status.status === 'Expired') {
    return `${head}\nYour hold or queue entry has ended (lease or claim window ran out, hard cap passed, or the entry was dropped). ` +
      'Stop using the resource. Acquire again to queue at the back.\n';
  }

  return `${head}\nThe backend has no hold or queue entry for this owner. Acquire to queue.\n`;
}

/** One line for a queue change while `acquire --wait` runs. */
export function formatLockProgressLine(status: LockStatusDto): string {
  const holder = holderText(status);
  return `Lock ${status.lockId}: still queued, position ${status.position} of ${status.queueLength}` +
    `${holder ? `, held by ${holder}` : ''}.\n`;
}

/** How a wait ended, after the status text, for outcomes other than success. */
export function formatLockWaitEnd(result: LockWaitResult, released: boolean | undefined): string {
  switch (result.outcome) {
    case 'timeout':
      return `Timed out after ${result.elapsedSeconds}s waiting for lock ${result.status.lockId}; ` +
        `${released ? 'the queue entry was released.' : 'the queue entry could not be released and will expire on its own.'}\n`;
    case 'cancelled':
      return `Interrupted while waiting for lock ${result.status.lockId}; ` +
        `${released ? 'the queue entry was released.' : 'the queue entry could not be released and will expire on its own.'}\n`;
    case 'lost':
      return `The backend dropped the queue entry for lock ${result.status.lockId} (${result.status.status}). ` +
        'Acquire again to queue at the back.\n';
    default:
      return '';
  }
}

export function formatLockReleaseHuman(release: LockReleaseDto): string {
  const holder = release.holderOwnerId ? `held by ${release.holderOwnerId}` : 'free';
  const subject = `owner ${release.ownerId} on lock ${release.lockId}`;
  return release.released
    ? `Released ${release.previousStatus === 'Holding' ? 'the lock' : 'the queue entry'} of ${subject}. The lock is now ${holder}.\n`
    : `Nothing to release for ${subject} (it was ${release.previousStatus}). The lock is ${holder}.\n`;
}

export function formatLockListHuman(locks: LockSummaryDto[]): string {
  if (locks.length === 0) {
    return 'No busy locks.\n';
  }

  return `Locks (${locks.length})\n${renderTable<LockSummaryDto>(
    [
      { header: 'LOCK', value: lock => lock.lockId },
      { header: 'HOLDER', value: lock => lock.holderOwnerId ?? '-' },
      { header: 'LABEL', value: lock => lock.holderLabel ?? '' },
      { header: 'EPOCH', value: lock => String(lock.epoch) },
      { header: 'LEASE EXPIRES', value: lock => lock.leaseExpiresAt ?? '' },
      { header: 'QUEUE', value: lock => String(lock.queueLength) },
    ],
    locks,
  )}\n`;
}

import type { Command } from 'commander';
import {
  formatLockProgressLine,
  formatLockStatusHuman,
  formatLockWaitEnd,
} from '../../../formatters/lock';
import { formatJson } from '../../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  onProcessInterrupt,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { CliLockLostError, CliOperationFailedError, CliUsageError, CliWaitTimeoutError } from '../../../runtime/errors';
import type { LockStatusDto } from '../../../runtime/hagiApi';
import { DEFAULT_LOCK_WAIT_TIMEOUT_SECONDS, waitForLockTurn } from '../../../runtime/lockWait';
import { addLockTargetOptions, guardLock, lockClock, parseWholeSeconds, resolveLockTarget, type LockTargetOptions } from './options';

type LockAcquireOptions = LockTargetOptions & {
  wait?: boolean;
  timeout?: string;
  leaseSeconds?: string;
  label?: string;
  json?: boolean;
};

export function registerLockAcquireCommand(parent: Command, dependencies: AppDependencies): void {
  addLockTargetOptions(
    addJsonOption(
      parent
        .command('acquire')
        .description(
          'Take the lock or join its queue. Without --wait: one call, exit 0 for Holding and Queued. With --wait: wait for the turn, exit 0 only when Holding. There is no force option.',
        ),
    ),
  )
    .option('--wait', 'Keep waiting in the queue (long-poll) until you hold the lock. Run it as a continuous watcher.')
    .option('--timeout <seconds>', `With --wait: give up after this many seconds (default ${DEFAULT_LOCK_WAIT_TIMEOUT_SECONDS}), release the queue entry, exit code 31.`)
    .option('--lease-seconds <n>', 'Requested lease length in seconds (the backend clamps it to 30 to 600).')
    .option('--label <text>', 'Short label shown to others as the holder (at most 200 characters).')
    .action(async function lockAcquireAction(this: Command, options: LockAcquireOptions) {
      if (!options.wait && options.timeout !== undefined) {
        throw new CliUsageError('--timeout needs --wait.');
      }

      const timeoutSeconds = options.wait
        ? parseWholeSeconds(options.timeout, '--timeout', 1) ?? DEFAULT_LOCK_WAIT_TIMEOUT_SECONDS
        : undefined;
      const leaseSeconds = parseWholeSeconds(options.leaseSeconds, '--lease-seconds', 1);
      const context = createCommandContext(this, dependencies);
      const target = resolveLockTarget(options, context.env);
      const initial = await guardLock(() =>
        context.api.acquireLock({ ...target, leaseSeconds, label: normalizeOptionalString(options.label) }),
      );
      const printStatus = (status: LockStatusDto) =>
        context.io.stdout(context.outputJson ? formatJson(status) : formatLockStatusHuman(status, 'acquire'));

      if (timeoutSeconds === undefined || initial.status === 'Holding') {
        printStatus(initial);
        return;
      }

      if (initial.status !== 'Queued') {
        printStatus(initial);
        throw new CliLockLostError(`Owner ${target.ownerId} neither holds nor queues for lock ${target.lockId} (${initial.status}).`, {
          reported: true,
        });
      }

      // Only a queued entry is ours to cancel: a lock the owner already held answered Holding above and never gets here.
      if (!context.outputJson) {
        printStatus(initial);
      }

      const controller = new AbortController();
      const removeInterrupt = (dependencies.onInterrupt ?? onProcessInterrupt)(() => controller.abort());
      let result;
      try {
        result = await waitForLockTurn({
          initial,
          read: (waitSeconds, signal) => context.api.getLockStatus({ ...target, waitSeconds }, signal),
          timeoutSeconds,
          clock: lockClock(dependencies),
          signal: controller.signal,
          onChange: status => {
            if (!context.outputJson) {
              context.io.stdout(formatLockProgressLine(status));
            }
          },
        });
      } finally {
        removeInterrupt();
      }

      let released: boolean | undefined;
      if (result.outcome === 'timeout' || result.outcome === 'cancelled') {
        released = await context.api.releaseLock(target).then(() => true, () => false);
      }

      const wait = { outcome: result.outcome, polls: result.polls, elapsedSeconds: result.elapsedSeconds, released };
      if (context.outputJson) {
        context.io.stdout(formatJson({ ...result.status, wait }));
      } else {
        context.io.stdout(
          result.outcome === 'holding'
            ? formatLockStatusHuman(result.status, 'status')
            : formatLockWaitEnd(result, released),
        );
      }

      switch (result.outcome) {
        case 'timeout':
          throw new CliWaitTimeoutError(
            `Timed out after ${result.elapsedSeconds}s waiting for lock ${target.lockId}; last status ${result.status.status}.`,
          );
        case 'cancelled':
          throw new CliOperationFailedError(`Interrupted while waiting for lock ${target.lockId}; the lock was not acquired.`);
        case 'lost':
          throw new CliLockLostError(`The queue entry for lock ${target.lockId} was dropped (${result.status.status}).`, {
            reported: true,
          });
        default:
      }
    });
}

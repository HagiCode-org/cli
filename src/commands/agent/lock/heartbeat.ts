import type { Command } from 'commander';
import {
  addJsonOption,
  createCommandContext,
  onProcessInterrupt,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { CliLockLostError } from '../../../runtime/errors';
import { runLockHeartbeat } from '../../../runtime/lockHeartbeat';
import { addLockTargetOptions, lockClock, parseEpoch, parseWholeSeconds, resolveLockTarget, type LockTargetOptions } from './options';

type LockHeartbeatOptions = LockTargetOptions & {
  epoch?: string;
  interval?: string;
  leaseSeconds?: string;
  verbose?: boolean;
  json?: boolean;
};

export function registerLockHeartbeatCommand(parent: Command, dependencies: AppDependencies): void {
  addLockTargetOptions(
    addJsonOption(
      parent
        .command('heartbeat')
        .description(
          'Keep a held lock alive: renew now and then every interval. Long-running and quiet on success; run it under a watcher. Exit code 32 when the lock is lost. Stopping it (SIGINT or SIGTERM) exits 0 and does not release.',
        ),
    ),
  )
    .option('--epoch <n>', 'Epoch of your grant. Without it, the epoch of the first status read is used, and only while you hold the lock.')
    .option('--interval <seconds>', 'Seconds between renewals (default: the interval the backend suggests, 120).')
    .option('--lease-seconds <n>', 'Requested lease length in seconds on every renewal (the backend clamps it to 30 to 600).')
    .option('--verbose', 'Also print one line per successful renewal.')
    .action(async function lockHeartbeatAction(this: Command, options: LockHeartbeatOptions) {
      const epoch = parseEpoch(options.epoch);
      const intervalSeconds = parseWholeSeconds(options.interval, '--interval', 1);
      const leaseSeconds = parseWholeSeconds(options.leaseSeconds, '--lease-seconds', 1);
      const context = createCommandContext(this, dependencies);
      const target = resolveLockTarget(options, context.env);

      const controller = new AbortController();
      const removeInterrupt = (dependencies.onInterrupt ?? onProcessInterrupt)(() => controller.abort());
      try {
        const result = await runLockHeartbeat({
          ...target,
          epoch,
          intervalSeconds,
          leaseSeconds,
          verbose: options.verbose === true,
          api: context.api,
          clock: lockClock(dependencies),
          signal: controller.signal,
          emit: event => {
            context.io.stdout(
              context.outputJson
                ? `${JSON.stringify({ event: event.kind, ...target, message: event.message, errorCode: event.errorCode })}\n`
                : `${event.message}\n`,
            );
          },
        });

        if (result.outcome !== 'stopped') {
          // The reason line was already printed as an event; the exit code is the part left to say.
          throw new CliLockLostError(result.message ?? `Lock ${target.lockId} is lost.`, { reported: true });
        }
      } finally {
        removeInterrupt();
      }
    });
}

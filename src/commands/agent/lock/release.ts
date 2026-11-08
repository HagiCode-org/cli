import type { Command } from 'commander';
import { formatLockReleaseHuman } from '../../../formatters/lock';
import { formatJson } from '../../../formatters/json';
import { addJsonOption, createCommandContext, type AppDependencies } from '../../../runtime/commandContext';
import { addLockTargetOptions, guardLock, parseEpoch, resolveLockTarget, type LockTargetOptions } from './options';

type LockReleaseOptions = LockTargetOptions & { epoch?: string; json?: boolean };

export function registerLockReleaseCommand(parent: Command, dependencies: AppDependencies): void {
  addLockTargetOptions(
    addJsonOption(
      parent
        .command('release')
        .description('Give the lock back, or leave the queue. Exit code 0 whether or not something was released. Stop the heartbeat first.'),
    ),
  )
    .option('--epoch <n>', 'Epoch of your grant, as printed by acquire. A stale epoch is refused, so a slow old holder cannot release a newer grant.')
    .action(async function lockReleaseAction(this: Command, options: LockReleaseOptions) {
      const epoch = parseEpoch(options.epoch);
      const context = createCommandContext(this, dependencies);
      const target = resolveLockTarget(options, context.env);
      const release = await guardLock(() => context.api.releaseLock({ ...target, epoch }));

      context.io.stdout(context.outputJson ? formatJson(release) : formatLockReleaseHuman(release));
    });
}

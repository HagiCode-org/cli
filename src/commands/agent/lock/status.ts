import type { Command } from 'commander';
import { formatLockStatusHuman } from '../../../formatters/lock';
import { formatJson } from '../../../formatters/json';
import { addJsonOption, createCommandContext, type AppDependencies } from '../../../runtime/commandContext';
import { addLockTargetOptions, guardLock, parseWholeSeconds, resolveLockTarget, type LockTargetOptions } from './options';

type LockStatusOptions = LockTargetOptions & { waitSeconds?: string; json?: boolean };

export function registerLockStatusCommand(parent: Command, dependencies: AppDependencies): void {
  addLockTargetOptions(
    addJsonOption(
      parent
        .command('status')
        .description('Read this owner\'s state on a lock: Holding, Queued, Expired, Requisitioned or None. Exit code 0 for all of them.'),
    ),
  )
    .option('--wait-seconds <n>', 'Long-poll: return early when the state changes, or after this many seconds (the server caps it at 25).')
    .action(async function lockStatusAction(this: Command, options: LockStatusOptions) {
      const waitSeconds = parseWholeSeconds(options.waitSeconds, '--wait-seconds', 0);
      const context = createCommandContext(this, dependencies);
      const target = resolveLockTarget(options, context.env);
      const status = await guardLock(() => context.api.getLockStatus({ ...target, waitSeconds }));

      context.io.stdout(context.outputJson ? formatJson(status) : formatLockStatusHuman(status, 'status'));
    });
}

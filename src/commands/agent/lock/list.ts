import type { Command } from 'commander';
import { formatLockListHuman } from '../../../formatters/lock';
import { formatJson } from '../../../formatters/json';
import { addJsonOption, createCommandContext, normalizeOptionalString, type AppDependencies } from '../../../runtime/commandContext';
import { guardLock } from './options';

type LockListOptions = { prefix?: string; json?: boolean };

export function registerLockListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List the locks that have a holder or a queue. An empty result exits 0.'),
  )
    .option('--prefix <text>', 'Only locks whose ID starts with this text.')
    .action(async function lockListAction(this: Command, options: LockListOptions) {
      const context = createCommandContext(this, dependencies);
      const locks = await guardLock(() => context.api.listLocks(normalizeOptionalString(options.prefix)));

      context.io.stdout(context.outputJson ? formatJson({ locks }) : formatLockListHuman(locks));
    });
}

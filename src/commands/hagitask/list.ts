import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatHagiTaskListHuman, formatHagiTaskListPayload } from '../../formatters/hagitask';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

export function registerHagiTaskListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List the active HagiTasks with their id, version, title and description.'),
  )
    .action(async function hagiTaskListAction(this: Command) {
      const context = createCommandContext(this, dependencies);
      const items = await context.api.listHagiTaskSchemas();

      if (context.outputJson) {
        context.io.stdout(formatJson(formatHagiTaskListPayload(items)));
        return;
      }

      context.io.stdout(formatHagiTaskListHuman(items));
    });
}

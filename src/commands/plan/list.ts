import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanListHuman, formatPlanListPayload } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

export function registerPlanListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List scheduled plans with their state, next run time and schedule.'),
  )
    .action(async function planListAction(this: Command) {
      const context = createCommandContext(this, dependencies);
      const payload = formatPlanListPayload(await context.api.listPlans());

      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatPlanListHuman(payload.plans));
    });
}

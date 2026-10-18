import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanDeleteHuman, formatPlanDeletePayload } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type PlanDeleteOptions = {
  id: string;
  json?: boolean;
};

export function registerPlanDeleteCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('delete')
      .description('Delete a scheduled plan by id.'),
  )
    .requiredOption('--id <id>', 'Plan id to delete.')
    .action(async function planDeleteAction(this: Command, options: PlanDeleteOptions) {
      const context = createCommandContext(this, dependencies);
      const planId = requireOptionValue(options.id, '--id');
      await context.api.deletePlan(planId);

      const payload = formatPlanDeletePayload(planId);
      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatPlanDeleteHuman(payload));
    });
}

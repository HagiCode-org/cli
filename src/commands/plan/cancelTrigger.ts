import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanSummaryHuman, toPlanView } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type PlanCancelTriggerOptions = {
  id: string;
  json?: boolean;
};

/**
 * Cancels the pending quota-reset trigger of a plan and prints the plan the backend returns. The backend succeeds
 * with no effect when nothing is pending, so this command does too.
 */
export function registerPlanCancelTriggerCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('cancel-trigger')
      .description('Cancel the pending quota-reset trigger of a plan without running it. Succeeds with no effect when nothing is pending.'),
  )
    .requiredOption('--id <id>', 'Plan id whose pending quota trigger to cancel.')
    .action(async function planCancelTriggerAction(this: Command, options: PlanCancelTriggerOptions) {
      const context = createCommandContext(this, dependencies);
      const view = toPlanView(await context.api.cancelPlanQuotaTrigger(requireOptionValue(options.id, '--id')));

      if (context.outputJson) {
        context.io.stdout(formatJson({ plan: view }));
        return;
      }

      context.io.stdout(`Quota trigger cancelled\n${formatPlanSummaryHuman(view)}`);
    });
}

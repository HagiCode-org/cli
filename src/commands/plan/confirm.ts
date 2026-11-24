import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatPlanRunAcceptedHuman,
  formatPlanRunAcceptedPayload,
} from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type PlanConfirmOptions = {
  id: string;
  json?: boolean;
};

/**
 * Confirms a quota-reset trigger that waits for manual confirmation. The backend starts the run and answers 409 when
 * no trigger is waiting (already answered, expired or never raised); that maps to exit code 29 and prints no accepted run.
 */
export function registerPlanConfirmCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('confirm')
      .description('Confirm the pending quota-reset trigger of a plan so its run starts. Fails with exit code 29 when no trigger is waiting.'),
  )
    .requiredOption('--id <id>', 'Plan id whose pending quota trigger to confirm.')
    .action(async function planConfirmAction(this: Command, options: PlanConfirmOptions) {
      const context = createCommandContext(this, dependencies);
      const payload = formatPlanRunAcceptedPayload(
        await context.api.confirmPlanQuotaTrigger(requireOptionValue(options.id, '--id')),
      );

      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatPlanRunAcceptedHuman(payload));
    });
}

import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatPlanRunAcceptedHuman,
  formatPlanRunAcceptedPayload,
} from '../../formatters/plan';
import { formatSessionSummaryHuman, toSessionView } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type PlanRunOptions = {
  id: string;
  background?: boolean;
  json?: boolean;
};

/**
 * Runs a plan now. Neither mode sends an update, so the plan's state and next run time stay as the backend keeps
 * them, including for disabled and completed plans.
 */
export function registerPlanRunCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('run')
      .description('Run a scheduled plan now from its stored inputs. The schedule is not changed.'),
  )
    .requiredOption('--id <id>', 'Plan id to run.')
    .option('--background', 'Start the run and print the accepted plan id without waiting for the session.')
    .action(async function planRunAction(this: Command, options: PlanRunOptions) {
      const context = createCommandContext(this, dependencies);
      const planId = requireOptionValue(options.id, '--id');

      if (options.background) {
        const payload = formatPlanRunAcceptedPayload(await context.api.startPlan(planId));
        if (context.outputJson) {
          context.io.stdout(formatJson(payload));
          return;
        }

        context.io.stdout(formatPlanRunAcceptedHuman(payload));
        return;
      }

      const session = toSessionView(await context.api.runPlan(planId));
      if (context.outputJson) {
        context.io.stdout(formatJson({ session }));
        return;
      }

      context.io.stdout(`Plan run created a session\n${formatSessionSummaryHuman(session)}`);
    });
}

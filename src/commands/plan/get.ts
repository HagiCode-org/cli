import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanSummaryHuman, toPlanView } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type PlanGetOptions = {
  id: string;
  json?: boolean;
};

export function registerPlanGetCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('get')
      .description('Show one scheduled plan, including its schedule, agent pool and payload in --json mode.'),
  )
    .requiredOption('--id <id>', 'Plan id to read.')
    .action(async function planGetAction(this: Command, options: PlanGetOptions) {
      const context = createCommandContext(this, dependencies);
      const view = toPlanView(await context.api.getPlan(requireOptionValue(options.id, '--id')));

      if (context.outputJson) {
        context.io.stdout(formatJson({ plan: view }));
        return;
      }

      context.io.stdout(formatPlanSummaryHuman(view));
    });
}

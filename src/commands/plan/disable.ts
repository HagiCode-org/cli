import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanSummaryHuman } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { setPlanEnabled } from './toggle';

export type PlanDisableOptions = {
  id: string;
  json?: boolean;
};

export function registerPlanDisableCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('disable')
      .description('Disable a scheduled plan. Nothing is sent when it is already disabled.'),
  )
    .requiredOption('--id <id>', 'Plan id to disable.')
    .action(async function planDisableAction(this: Command, options: PlanDisableOptions) {
      const context = createCommandContext(this, dependencies);
      const { view, changed } = await setPlanEnabled(context, requireOptionValue(options.id, '--id'), false);

      if (context.outputJson) {
        context.io.stdout(formatJson({ plan: view, changed }));
        return;
      }

      context.io.stdout(`${changed ? 'Plan disabled' : 'Plan was already disabled'}\n${formatPlanSummaryHuman(view)}`);
    });
}

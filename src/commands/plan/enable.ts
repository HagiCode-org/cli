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

export type PlanEnableOptions = {
  id: string;
  json?: boolean;
};

export function registerPlanEnableCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('enable')
      .description('Enable a scheduled plan. Nothing is sent when it is already enabled.'),
  )
    .requiredOption('--id <id>', 'Plan id to enable.')
    .action(async function planEnableAction(this: Command, options: PlanEnableOptions) {
      const context = createCommandContext(this, dependencies);
      const { view, changed } = await setPlanEnabled(context, requireOptionValue(options.id, '--id'), true);

      if (context.outputJson) {
        context.io.stdout(formatJson({ plan: view, changed }));
        return;
      }

      context.io.stdout(`${changed ? 'Plan enabled' : 'Plan was already enabled'}\n${formatPlanSummaryHuman(view)}`);
    });
}

import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanSummaryHuman, toPlanView } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { buildFlagChanges, loadPlanDocument, mergePlan, stripServerFields } from './input';

export type PlanUpdateOptions = {
  id: string;
  input?: string;
  name?: string;
  heroId?: string;
  enabled?: boolean;
  disabled?: boolean;
  json?: boolean;
};

export function registerPlanUpdateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('update')
      .description('Update a scheduled plan. The current plan is read first and only the given fields change.'),
  )
    .requiredOption('--id <id>', 'Plan id to update.')
    .option('--input <file|->', 'JSON document whose top-level fields replace the same fields of the plan.')
    .option('--name <name>', 'Updated plan name.')
    .option('--hero-id <id>', 'Hero for a single-agent pool. Replaces the agent pool.')
    .option('--enabled', 'Enable the plan.')
    .option('--disabled', 'Disable the plan.')
    .action(async function planUpdateAction(this: Command, options: PlanUpdateOptions) {
      const planId = requireOptionValue(options.id, '--id');
      const input = normalizeOptionalString(options.input);
      const name = normalizeOptionalString(options.name);
      const heroId = normalizeOptionalString(options.heroId);

      if (options.enabled && options.disabled) {
        throw new CliUsageError('Pass either --enabled or --disabled, not both.');
      }

      const enabled = options.enabled ? true : options.disabled ? false : undefined;
      if (!input && !name && !heroId && enabled === undefined) {
        throw new CliUsageError('Provide at least one change: --input, --name, --enabled, --disabled, or --hero-id.');
      }

      const documentChanges = input ? stripServerFields(await loadPlanDocument(input)) : {};
      const context = createCommandContext(this, dependencies);
      const current = await context.api.getPlan(planId);
      const view = toPlanView(await context.api.updatePlan(
        planId,
        mergePlan(current, {
          ...documentChanges,
          ...buildFlagChanges({ name, heroId, enabled }),
        }),
      ));

      if (context.outputJson) {
        context.io.stdout(formatJson({ plan: view }));
        return;
      }

      context.io.stdout(`Plan updated\n${formatPlanSummaryHuman(view)}`);
    });
}

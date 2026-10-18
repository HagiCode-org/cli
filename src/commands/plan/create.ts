import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanSummaryHuman, toPlanView } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import { buildFlagChanges, loadPlanDocument, stripServerFields } from './input';

export type PlanCreateOptions = {
  input: string;
  name?: string;
  heroId?: string;
  disabled?: boolean;
  json?: boolean;
};

export function registerPlanCreateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('create')
      .description('Create a scheduled plan from a JSON document. Plans are enabled unless --disabled or the document says otherwise.'),
  )
    .requiredOption('--input <file|->', 'Plan JSON file path, or - to read from stdin.')
    .option('--name <name>', 'Plan name. Overrides the document name.')
    .option('--hero-id <id>', 'Hero for a single-agent pool. Replaces the document agent pool.')
    .option('--disabled', 'Create the plan disabled. Overrides the document enabled value.')
    .action(async function planCreateAction(this: Command, options: PlanCreateOptions) {
      const context = createCommandContext(this, dependencies);
      const document = stripServerFields(await loadPlanDocument(options.input));
      const view = toPlanView(await context.api.createPlan({
        enabled: true,
        ...document,
        ...buildFlagChanges({
          name: normalizeOptionalString(options.name),
          heroId: normalizeOptionalString(options.heroId),
          enabled: options.disabled ? false : undefined,
        }),
      }));

      if (context.outputJson) {
        context.io.stdout(formatJson({ plan: view }));
        return;
      }

      context.io.stdout(`Plan created\n${formatPlanSummaryHuman(view)}`);
    });
}

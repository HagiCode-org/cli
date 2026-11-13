import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPlanSummaryHuman, toPlanView } from '../../formatters/plan';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import {
  addPlanScheduleOptions,
  buildFlagChanges,
  buildScheduleChange,
  loadPlanDocument,
  parseScheduleFlags,
  stripServerFields,
  type PlanScheduleFlags,
} from './input';

export type PlanCreateOptions = PlanScheduleFlags & {
  input: string;
  name?: string;
  heroId?: string;
  disabled?: boolean;
  json?: boolean;
};

export function registerPlanCreateCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('create')
      .description('Create a scheduled plan from a JSON document. Plans are enabled unless --disabled or the document says otherwise. Schedule flags build an interval schedule and override the document schedule.'),
  )
    .requiredOption('--input <file|->', 'Plan JSON file path, or - to read from stdin.')
    .option('--name <name>', 'Plan name. Overrides the document name.')
    .option('--hero-id <id>', 'Hero for a single-agent pool. Replaces the document agent pool.')
    .option('--disabled', 'Create the plan disabled. Overrides the document enabled value.');

  addPlanScheduleOptions(command)
    .action(async function planCreateAction(this: Command, options: PlanCreateOptions) {
      const context = createCommandContext(this, dependencies);
      const scheduleFlags = parseScheduleFlags(options);
      const document = stripServerFields(await loadPlanDocument(options.input));
      const schedule = buildScheduleChange(scheduleFlags, document.schedule);
      const view = toPlanView(await context.api.createPlan({
        enabled: true,
        ...document,
        ...(schedule ? { schedule } : {}),
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

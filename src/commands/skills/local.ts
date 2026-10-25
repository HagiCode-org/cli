import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatBuiltInAvailabilityResultHuman,
  formatLocalSkillsHuman,
  formatUninstallResultHuman,
} from '../../formatters/skills';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliOperationFailedError } from '../../runtime/errors';

type SkillsLocalUninstallOptions = {
  skillName: string;
  json?: boolean;
};

type SkillsLocalAvailabilityOptions = {
  skillName: string;
  json?: boolean;
};

const APPLIES_TO_NEXT_RUNS = 'The change applies to agent runs that start afterwards; a run already in progress keeps its skills.';

function registerBuiltInAvailabilityCommand(local: Command, dependencies: AppDependencies, enabled: boolean): void {
  const action = enabled ? 'enable' : 'disable';

  addJsonOption(
    local
      .command(action)
      .description(`${enabled ? 'Turn on' : 'Turn off'} one built-in skill by name. ${APPLIES_TO_NEXT_RUNS}`),
  )
    .requiredOption('--skill-name <name>', `Built-in skill name to ${action}.`)
    .action(async function skillsLocalAvailabilityAction(this: Command, options: SkillsLocalAvailabilityOptions) {
      const context = createCommandContext(this, dependencies);
      const result = await context.api.setBuiltInSkillAvailability({
        slug: requireOptionValue(options.skillName, '--skill-name'),
        enabled,
      });

      if (context.outputJson) {
        context.io.stdout(formatJson(result));
      } else {
        context.io.stdout(formatBuiltInAvailabilityResultHuman(result));
      }

      if (!result.succeeded) {
        throw new CliOperationFailedError(
          result.userMessage ?? `The built-in skill availability was not changed for ${result.slug ?? options.skillName}.`,
        );
      }
    });
}

export function registerSkillsLocalCommands(skills: Command, dependencies: AppDependencies): void {
  const local = skills
    .command('local')
    .description('List, enable or disable built-in skills, and uninstall user-installed local skills.');

  addJsonOption(
    local
      .command('list')
      .description('List installed local skills with their managed install metadata.'),
  ).action(async function skillsLocalListAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const response = await context.api.listLocalSkills();

    if (context.outputJson) {
      context.io.stdout(formatJson(response));
      return;
    }

    context.io.stdout(formatLocalSkillsHuman(response));
  });

  registerBuiltInAvailabilityCommand(local, dependencies, true);
  registerBuiltInAvailabilityCommand(local, dependencies, false);

  addJsonOption(
    local
      .command('uninstall')
      .description(
        'Uninstall one user-installed local skill by name. Built-in skills cannot be uninstalled; use `skills local disable --skill-name <name>` to stop one from loading.',
      ),
  )
    .requiredOption('--skill-name <name>', 'Local skill name to uninstall.')
    .action(async function skillsLocalUninstallAction(this: Command, options: SkillsLocalUninstallOptions) {
      const context = createCommandContext(this, dependencies);
      const result = await context.api.uninstallLocalSkill({
        skillName: requireOptionValue(options.skillName, '--skill-name'),
      });

      if (context.outputJson) {
        context.io.stdout(formatJson(result));
        return;
      }

      context.io.stdout(formatUninstallResultHuman(result));
    });
}

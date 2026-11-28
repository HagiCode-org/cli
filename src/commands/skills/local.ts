import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatBuiltInAvailabilityResultHuman,
  formatLocalSkillsHuman,
  formatSelfEvolutionAvailabilityResultHuman,
  localSkillOrigin,
} from '../../formatters/skills';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliOperationFailedError } from '../../runtime/errors';

type SkillsLocalAvailabilityOptions = {
  skillName: string;
  json?: boolean;
};

const APPLIES_TO_NEXT_RUNS = 'The change applies to agent runs that start afterwards; a run already in progress keeps its skills.';

function registerAvailabilityCommand(local: Command, dependencies: AppDependencies, enabled: boolean): void {
  const action = enabled ? 'enable' : 'disable';

  addJsonOption(
    local
      .command(action)
      .description(`${APPLIES_TO_NEXT_RUNS} ${enabled ? 'Turn on' : 'Turn off'} one skill by name, built-in or Self Evolution.`),
  )
    .requiredOption('--skill-name <name>', `Skill name to ${action}. A built-in skill with the same name is changed first.`)
    .action(async function skillsLocalAvailabilityAction(this: Command, options: SkillsLocalAvailabilityOptions) {
      const context = createCommandContext(this, dependencies);
      const slug = requireOptionValue(options.skillName, '--skill-name');
      const inventory = await context.api.listLocalSkills();
      const sameName = (inventory.items ?? []).filter(item => item.name === slug);
      const hasBuiltIn = sameName.some(item => localSkillOrigin(item) === 'built-in');
      const hasSelfEvolution = sameName.some(item => localSkillOrigin(item) === 'self-evolution');

      if (hasSelfEvolution && !hasBuiltIn) {
        const result = await context.api.setSelfEvolutionSkillAvailability({ slug, enabled });

        if (context.outputJson) {
          context.io.stdout(formatJson(result));
        } else {
          context.io.stdout(formatSelfEvolutionAvailabilityResultHuman(result));
        }

        if (!result.succeeded) {
          throw new CliOperationFailedError(
            result.userMessage ?? `The self-evolution skill availability was not changed for ${result.slug ?? slug}.`,
          );
        }
        return;
      }

      // A built-in row keeps priority on a shared name; an unknown name goes here too, so the backend refusal is shown.
      const result = await context.api.setBuiltInSkillAvailability({ slug, enabled });

      if (context.outputJson) {
        context.io.stdout(formatJson(result));
      } else {
        context.io.stdout(formatBuiltInAvailabilityResultHuman(result, { selfEvolutionConflict: hasBuiltIn && hasSelfEvolution }));
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
    .description('List local skills (user, built-in and Self Evolution), and enable or disable built-in or Self Evolution skills.');

  addJsonOption(
    local
      .command('list')
      .description('List installed local skills with their origin and managed install metadata.'),
  ).action(async function skillsLocalListAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const response = await context.api.listLocalSkills();

    if (context.outputJson) {
      context.io.stdout(formatJson(response));
      return;
    }

    context.io.stdout(formatLocalSkillsHuman(response));
  });

  registerAvailabilityCommand(local, dependencies, true);
  registerAvailabilityCommand(local, dependencies, false);
}

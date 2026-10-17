import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatLocalSkillsHuman, formatUninstallResultHuman } from '../../formatters/skills';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

type SkillsLocalUninstallOptions = {
  skillName: string;
  json?: boolean;
};

export function registerSkillsLocalCommands(skills: Command, dependencies: AppDependencies): void {
  const local = skills
    .command('local')
    .description('List and uninstall globally installed local skills.');

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

  addJsonOption(
    local
      .command('uninstall')
      .description('Uninstall one managed local skill by name.'),
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

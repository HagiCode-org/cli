import type { Command } from 'commander';
import type { AppDependencies } from '../runtime/commandContext';
import { registerSkillsGalleryCommands } from './skills/gallery';
import { registerSkillsLocalCommands } from './skills/local';
import { registerSkillsTrustedCommands } from './skills/trusted';

export function registerSkillsCommands(program: Command, dependencies: AppDependencies): void {
  const skills = program
    .command('skills')
    .description('Manage local skills, the skill gallery, and trusted providers.');

  registerSkillsLocalCommands(skills, dependencies);
  registerSkillsGalleryCommands(skills, dependencies);
  registerSkillsTrustedCommands(skills, dependencies);
}

import type { Command } from 'commander';
import type { AppDependencies } from '../runtime/commandContext';
import { registerSkillsLocalCommands } from './skills/local';

export function registerSkillsCommands(program: Command, dependencies: AppDependencies): void {
  const skills = program
    .command('skills')
    .description('Manage local skills and built-in skill availability.');

  registerSkillsLocalCommands(skills, dependencies);
}

import type { Command } from 'commander';
import { registerProjectCreateCommand } from './project/create';
import { registerProjectDeleteCommand } from './project/delete';
import { registerProjectListCommand } from './project/list';
import { registerProjectUpdateCommand } from './project/update';
import type { AppDependencies } from '../runtime/commandContext';

export function registerProjectCommands(program: Command, dependencies: AppDependencies): void {
  const project = program
    .command('project')
    .description('Manage Hagi projects through generated project and aggregation APIs.');

  registerProjectListCommand(project, dependencies);
  registerProjectCreateCommand(project, dependencies);
  registerProjectUpdateCommand(project, dependencies);
  registerProjectDeleteCommand(project, dependencies);
}

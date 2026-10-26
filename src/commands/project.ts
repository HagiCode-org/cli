import type { Command } from 'commander';
import { registerProjectCreateCommand } from './project/create';
import { registerProjectDeleteCommand } from './project/delete';
import { registerProjectListCommand } from './project/list';
import { registerProjectMonoSpecsCommand } from './project/monospecs';
import { registerProjectRepositoriesCommand } from './project/repositories';
import { registerProjectUpdateCommand } from './project/update';
import type { AppDependencies } from '../runtime/commandContext';

export function registerProjectCommands(program: Command, dependencies: AppDependencies): void {
  const project = program
    .command('project')
    .description('Manage Hagi projects through generated project and aggregation APIs.');

  registerProjectListCommand(project, dependencies);
  registerProjectRepositoriesCommand(project, dependencies);
  registerProjectCreateCommand(project, dependencies);
  registerProjectUpdateCommand(project, dependencies);
  registerProjectDeleteCommand(project, dependencies);
  registerProjectMonoSpecsCommand(project, dependencies);
}

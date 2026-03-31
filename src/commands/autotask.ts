import type { Command } from 'commander';
import { registerAutoTaskCreateCommand } from './autotask/create';
import { registerAutoTaskSendCommand } from './autotask/send';
import type { AppDependencies } from '../runtime/commandContext';

export function registerAutoTaskCommands(program: Command, dependencies: AppDependencies): void {
  const autotask = program
    .command('autotask')
    .description('Manage AutoTask sessions.');

  registerAutoTaskCreateCommand(autotask, dependencies);
  registerAutoTaskSendCommand(autotask, dependencies);
}

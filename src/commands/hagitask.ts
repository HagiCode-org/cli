import type { Command } from 'commander';
import { registerHagiTaskCreateCommand } from './hagitask/create';
import { registerHagiTaskListCommand } from './hagitask/list';
import { registerHagiTaskSchemaCommand } from './hagitask/schema';
import { registerHagiTaskSendCommand } from './hagitask/send';
import type { AppDependencies } from '../runtime/commandContext';

export function registerHagiTaskCommands(program: Command, dependencies: AppDependencies): void {
  const hagitask = program
    .command('hagitask')
    .description('Manage HagiTask sessions: list tasks, read a task schema, create a session from it, and send follow-up messages.');

  registerHagiTaskListCommand(hagitask, dependencies);
  registerHagiTaskSchemaCommand(hagitask, dependencies);
  registerHagiTaskCreateCommand(hagitask, dependencies);
  registerHagiTaskSendCommand(hagitask, dependencies);
}

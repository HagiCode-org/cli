import type { Command } from 'commander';
import { registerHagiTaskCreateCommand } from './hagitask/create';
import { registerHagiTaskGetCommand } from './hagitask/get';
import { registerHagiTaskMessagesCommand } from './hagitask/messages';
import { registerHagiTaskListCommand } from './hagitask/list';
import { registerHagiTaskSchemaCommand } from './hagitask/schema';
import { registerHagiTaskSendCommand } from './hagitask/send';
import type { AppDependencies } from '../runtime/commandContext';

export function registerHagiTaskCommands(program: Command, dependencies: AppDependencies): void {
  const hagitask = program
    .command('hagitask')
    .description('Manage HagiTask sessions: list tasks, read a task schema, create a session from it, read one session with get (--wait to follow a run) and its messages, and send follow-up messages.');

  registerHagiTaskListCommand(hagitask, dependencies);
  registerHagiTaskSchemaCommand(hagitask, dependencies);
  registerHagiTaskCreateCommand(hagitask, dependencies);
  registerHagiTaskSendCommand(hagitask, dependencies);
  registerHagiTaskGetCommand(hagitask, dependencies);
  registerHagiTaskMessagesCommand(hagitask, dependencies);
}

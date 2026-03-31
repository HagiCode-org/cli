import type { Command } from 'commander';
import { registerChatArchiveCommand } from './chat/archive';
import { registerChatCreateCommand } from './chat/create';
import { registerChatDeleteCommand } from './chat/delete';
import { registerChatListCommand } from './chat/list';
import { registerChatSendCommand } from './chat/send';
import type { AppDependencies } from '../runtime/commandContext';

export function registerChatCommands(program: Command, dependencies: AppDependencies): void {
  const chat = program
    .command('chat')
    .description('Manage normal chat sessions.');

  registerChatListCommand(chat, dependencies);
  registerChatCreateCommand(chat, dependencies);
  registerChatArchiveCommand(chat, dependencies);
  registerChatDeleteCommand(chat, dependencies);
  registerChatSendCommand(chat, dependencies);
}

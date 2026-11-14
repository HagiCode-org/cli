import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionMessagesCommand } from '../session/sessionMessages';

export function registerChatMessagesCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionMessagesCommand(parent, dependencies, {
    description: 'Read a chat session\'s messages, newest first by default.',
  });
}

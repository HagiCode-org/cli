import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionMessagesCommand } from '../session/sessionMessages';

export function registerHagiTaskMessagesCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionMessagesCommand(parent, dependencies, {
    description: 'Read a HagiTask session\'s messages, newest first by default. For a Super Commit, --last 1 reads the final result message.',
  });
}

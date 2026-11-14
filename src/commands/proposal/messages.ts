import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionMessagesCommand } from '../session/sessionMessages';

export function registerProposalMessagesCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionMessagesCommand(parent, dependencies, {
    description: 'Read a proposal session\'s messages, newest first by default. Use --last 1 to read the final message of a run.',
  });
}

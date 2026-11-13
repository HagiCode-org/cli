import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionAnswerCommand } from '../session/sessionAnswer';

export function registerProposalAnswerCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionAnswerCommand(parent, dependencies, {
    description: 'Answer the pending question of a proposal session. Changes session state: run it only on an explicit user request or an explicit Saga instruction.',
    command: 'proposal',
  });
}

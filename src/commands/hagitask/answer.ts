import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionAnswerCommand } from '../session/sessionAnswer';

export function registerHagiTaskAnswerCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionAnswerCommand(parent, dependencies, {
    description: 'Answer the pending question of a HagiTask session. Changes session state: run it only on an explicit user request or an explicit Saga instruction.',
    command: 'hagitask',
  });
}

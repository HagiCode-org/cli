import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionGetCommand } from '../session/sessionGet';

export function registerHagiTaskGetCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionGetCommand(parent, dependencies, {
    description: 'Read one HagiTask session by id, including a Super Commit session. With --wait, poll until its status settles.',
    label: 'HagiTask session',
    command: 'hagitask',
  });
}

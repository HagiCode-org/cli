import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerSessionGetCommand } from '../session/sessionGet';

export function registerProposalGetCommand(parent: Command, dependencies: AppDependencies): void {
  registerSessionGetCommand(parent, dependencies, {
    description: 'Read one proposal session by id. With --wait, poll until its status settles, so a stage can be followed without guessing.',
    label: 'proposal session',
  });
}

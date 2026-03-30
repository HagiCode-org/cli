import type { Command } from 'commander';
import { registerProposalCreateCommand } from './proposal/create';
import { registerProposalExecuteCommand } from './proposal/execute';
import { registerProposalGenerateCommand } from './proposal/generate';
import { registerProposalGenerateNameCommand } from './proposal/generate-name';
import { registerProposalListCommand } from './proposal/list';
import type { AppDependencies } from '../runtime/commandContext';

export function registerProposalCommands(program: Command, dependencies: AppDependencies): void {
  const proposal = program
    .command('proposal')
    .description('Manage proposal sessions through backend session APIs.');

  registerProposalListCommand(proposal, dependencies);
  registerProposalCreateCommand(proposal, dependencies);
  registerProposalGenerateNameCommand(proposal, dependencies);
  registerProposalGenerateCommand(proposal, dependencies);
  registerProposalExecuteCommand(proposal, dependencies);
}

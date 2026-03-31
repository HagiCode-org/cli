import type { Command } from 'commander';
import { registerProposalAnnotateCommand } from './proposal/annotate';
import { registerProposalArchiveCommand } from './proposal/archive';
import { registerProposalCompleteCommand } from './proposal/complete';
import { registerProposalCreateCommand } from './proposal/create';
import { registerProposalExecuteCommand } from './proposal/execute';
import { registerProposalGenerateCommand } from './proposal/generate';
import { registerProposalGenerateNameCommand } from './proposal/generate-name';
import { registerProposalListCommand } from './proposal/list';
import { registerProposalOptimizeDescriptionCommand } from './proposal/optimize-description';
import { registerProposalSendCommand } from './proposal/send';
import { registerProposalStatusCommand } from './proposal/status';
import type { AppDependencies } from '../runtime/commandContext';

export function registerProposalCommands(program: Command, dependencies: AppDependencies): void {
  const proposal = program
    .command('proposal')
    .description('Manage proposal sessions through backend session APIs.');

  registerProposalListCommand(proposal, dependencies);
  registerProposalCreateCommand(proposal, dependencies);
  registerProposalGenerateNameCommand(proposal, dependencies);
  registerProposalOptimizeDescriptionCommand(proposal, dependencies);
  registerProposalGenerateCommand(proposal, dependencies);
  registerProposalAnnotateCommand(proposal, dependencies);
  registerProposalExecuteCommand(proposal, dependencies);
  registerProposalArchiveCommand(proposal, dependencies);
  registerProposalStatusCommand(proposal, dependencies);
  registerProposalCompleteCommand(proposal, dependencies);
  registerProposalSendCommand(proposal, dependencies);
}

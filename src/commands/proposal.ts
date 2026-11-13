import type { Command } from 'commander';
import { registerProposalAnnotateCommand } from './proposal/annotate';
import { registerProposalAnswerCommand } from './proposal/answer';
import { registerProposalArchiveCommand } from './proposal/archive';
import { registerProposalCompleteCommand } from './proposal/complete';
import { registerProposalCreateCommand } from './proposal/create';
import { registerProposalExecuteCommand } from './proposal/execute';
import { registerProposalGenerateCommand } from './proposal/generate';
import { registerProposalGetCommand } from './proposal/get';
import { registerProposalMessagesCommand } from './proposal/messages';
import { registerProposalListCommand } from './proposal/list';
import { registerProposalOptimizeDescriptionCommand } from './proposal/optimize-description';
import { registerProposalSendCommand } from './proposal/send';
import { registerProposalStatusCommand } from './proposal/status';
import type { AppDependencies } from '../runtime/commandContext';

export function registerProposalCommands(program: Command, dependencies: AppDependencies): void {
  const proposal = program
    .command('proposal')
    .description('Manage proposal sessions through backend session APIs: create, generate, execute and archive stages, read one session with get (--wait to follow a stage), and read its messages.');

  registerProposalListCommand(proposal, dependencies);
  registerProposalCreateCommand(proposal, dependencies);
  registerProposalOptimizeDescriptionCommand(proposal, dependencies);
  registerProposalGenerateCommand(proposal, dependencies);
  registerProposalAnnotateCommand(proposal, dependencies);
  registerProposalExecuteCommand(proposal, dependencies);
  registerProposalArchiveCommand(proposal, dependencies);
  registerProposalStatusCommand(proposal, dependencies);
  registerProposalGetCommand(proposal, dependencies);
  registerProposalMessagesCommand(proposal, dependencies);
  registerProposalAnswerCommand(proposal, dependencies);
  registerProposalCompleteCommand(proposal, dependencies);
  registerProposalSendCommand(proposal, dependencies);
}

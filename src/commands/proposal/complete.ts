import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionSummaryHuman, toSessionView } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

type ProposalCompleteOptions = {
  sessionId: string;
  json?: boolean;
};

export function registerProposalCompleteCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('complete')
      .description('Mark a proposal session as completed through the dedicated completion endpoint.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id to complete.')
    .action(async function proposalCompleteAction(this: Command, options: ProposalCompleteOptions) {
      const context = createCommandContext(this, dependencies);
      const session = await context.api.completeProposal(options.sessionId.trim());
      const view = toSessionView(session);

      if (context.outputJson) {
        context.io.stdout(formatJson({ session: view }));
        return;
      }

      context.io.stdout(`Proposal completed\n${formatSessionSummaryHuman(view)}`);
    });
}

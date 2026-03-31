import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionSummaryHuman, toSessionView } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';

type ProposalArchiveOptions = {
  sessionId: string;
  heroId?: string;
  json?: boolean;
};

export function registerProposalArchiveCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('archive')
      .description('Archive a proposal session through the explicit archive endpoint.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id to archive.')
    .option('--hero-id <id>', 'Optional hero override for archiving.')
    .action(async function proposalArchiveAction(this: Command, options: ProposalArchiveOptions) {
      const context = createCommandContext(this, dependencies);
      const session = await context.api.archiveProposal(options.sessionId.trim(), {
        heroId: normalizeOptionalString(options.heroId),
      });
      const view = toSessionView(session);

      if (context.outputJson) {
        context.io.stdout(formatJson({ session: view }));
        return;
      }

      context.io.stdout(`Proposal archive started\n${formatSessionSummaryHuman(view)}`);
    });
}

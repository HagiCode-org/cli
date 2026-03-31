import { Command, Option } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionSummaryHuman, toSessionView } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';
import { PCode_Models_SessionStatus } from '../../generated/api/models/PCode_Models_SessionStatus';

type ProposalStatusOptions = {
  sessionId: string;
  status: PCode_Models_SessionStatus;
  json?: boolean;
};

export function registerProposalStatusCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('status')
      .description('Update proposal session status through read-before-write merging.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id.')
    .addOption(
      new Option('--status <status>', 'Target session status.')
        .choices(Object.values(PCode_Models_SessionStatus))
        .makeOptionMandatory(),
    )
    .action(async function proposalStatusAction(this: Command, options: ProposalStatusOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const current = await context.api.getSession(sessionId);

      await context.api.updateSession(sessionId, {
        title: current.title,
        description: current.description,
        status: options.status,
        metadata: current.metadata,
      });

      const merged = toSessionView({
        ...current,
        status: options.status,
      });

      if (context.outputJson) {
        context.io.stdout(formatJson({ session: merged }));
        return;
      }

      context.io.stdout(`Proposal status updated\n${formatSessionSummaryHuman(merged)}`);
    });
}

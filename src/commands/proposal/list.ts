import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatProposalSessionListHuman,
  toProposalSessionListPayload,
} from '../../formatters/proposal';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { PCode_Models_SessionType } from '../../generated/api/models/PCode_Models_SessionType';

type ProposalListOptions = {
  projectId?: string;
  projectIds?: string[];
  activeOnly?: boolean;
  includeArchived?: boolean;
  json?: boolean;
};

export function registerProposalListCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('list')
      .description('List proposal sessions from the backend Sessions API.'),
  );

  command
    .option('--project-id <id>', 'Filter proposal sessions by a single project id.')
    .option('--project-ids <ids...>', 'Filter proposal sessions by multiple project ids.')
    .option('--active-only', 'Only return non-archived proposal sessions.')
    .option('--include-archived', 'Include archived proposal sessions in the result set.')
    .action(async function proposalListAction(this: Command, options: ProposalListOptions) {
      if (options.projectId && options.projectIds?.length) {
        throw new CliUsageError('Use either --project-id or --project-ids, not both.');
      }

      const context = createCommandContext(this, dependencies);
      const response = await context.api.listSessions({
        type: PCode_Models_SessionType.PROPOSAL,
        projectId: normalizeOptionalString(options.projectId),
        projectIds: options.projectIds?.map(normalizeOptionalString).filter(Boolean) as string[] | undefined,
        activeOnly: options.activeOnly ? true : undefined,
        includeArchived: options.includeArchived ? true : undefined,
      });

      const payload = toProposalSessionListPayload(response);
      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatProposalSessionListHuman(payload.sessions));
    });
}

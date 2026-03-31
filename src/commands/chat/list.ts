import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatSessionListHuman,
  toSessionListPayload,
} from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  normalizeOptionalStringArray,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { PCode_Models_SessionType } from '../../generated/api/models/PCode_Models_SessionType';

type ChatListOptions = {
  projectId?: string;
  projectIds?: string[];
  activeOnly?: boolean;
  includeArchived?: boolean;
  json?: boolean;
};

export function registerChatListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List normal chat sessions.'),
  ).action(async function chatListAction(this: Command, options: ChatListOptions) {
    if (options.projectId && options.projectIds?.length) {
      throw new CliUsageError('Use either --project-id or --project-ids, not both.');
    }

    const context = createCommandContext(this, dependencies);
    const response = await context.api.listSessions({
      type: PCode_Models_SessionType.CHAT,
      projectId: normalizeOptionalString(options.projectId),
      projectIds: normalizeOptionalStringArray(options.projectIds),
      activeOnly: options.activeOnly ? true : undefined,
      includeArchived: options.includeArchived ? true : undefined,
    });
    const payload = toSessionListPayload(response);

    if (context.outputJson) {
      context.io.stdout(formatJson(payload));
      return;
    }

    context.io.stdout(formatSessionListHuman('Chat sessions', payload.sessions));
  })
    .option('--project-id <id>', 'Filter chat sessions by a single project id.')
    .option('--project-ids <ids...>', 'Filter chat sessions by multiple project ids.')
    .option('--active-only', 'Only return non-archived chat sessions.')
    .option('--include-archived', 'Include archived chat sessions.');
}

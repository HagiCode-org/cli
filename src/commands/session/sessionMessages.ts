import { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatPendingQuestionHuman, formatSessionMessagesHuman } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliNotFoundError, CliUsageError } from '../../runtime/errors';
import { findPendingQuestion } from '../../runtime/questionAnswers';

/** Raw options shared by chat, proposal and HagiTask message readers. */
export type SessionMessagesOptions = {
  sessionId: string;
  last?: string;
  page?: string;
  pageSize?: string;
  order?: string;
  json?: boolean;
  pendingQuestion?: boolean;
};

/**
 * `--last n` must be a positive whole number. Omitting it reads the backend's first page.
 * Verified in repos/hagicode-core (`SessionMessagingAppService.GetMessages`): the default order is `desc` by timestamp,
 * so `page=1, pageSize=n, order=desc` returns the n newest messages. `historyScope` only filters Proposal sessions, so it
 * is not sent. The backend clamps `pageSize` to its maximum; the largest value it accepts is not checked here.
 */
export function parseLastOption(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1) {
    throw new CliUsageError('--last must be a positive whole number.');
  }

  return Number(trimmed);
}

function parsePageOption(raw: string | undefined, flag: string): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  const value = Number(trimmed);
  if (!/^\d+$/.test(trimmed) || !Number.isSafeInteger(value) || value < 1) {
    throw new CliUsageError(`${flag} must be a positive safe integer.`);
  }

  return value;
}

/**
 * Registers a `messages` command that reads a session's messages, newest first by default. `--last n` asks for the n
 * newest messages in one page; `--json` prints the backend's message list unchanged.
 */
export function registerSessionMessagesCommand(
  parent: Command,
  dependencies: AppDependencies,
  options: { description: string },
): void {
  addJsonOption(
    parent
      .command('messages')
      .description(options.description),
  )
    .requiredOption('--session-id <id>', 'Session id whose messages to read.')
    .option('--last <n>', 'Read the n newest messages in one descending page, capped at 200 by the backend. Cannot combine with paging options.')
    .option('--page <n>', 'Read this page (positive safe integer, default 1). Cannot combine with --last.')
    .option('--page-size <n>', 'Messages per page (positive safe integer, backend default 50, maximum 200). Cannot combine with --last.')
    .option('--order <asc|desc>', 'Message order (default desc). Cannot combine with --last.')
    .option('--pending-question', 'Print only the question that is still pending, from the same read. Exit code 24 when none is pending.')
    .action(async function sessionMessagesAction(this: Command, rawOptions: SessionMessagesOptions) {
      if (rawOptions.last !== undefined && [rawOptions.page, rawOptions.pageSize, rawOptions.order].some(value => value !== undefined)) {
        throw new CliUsageError('--last and --page, --page-size or --order are mutually exclusive.');
      }

      const last = parseLastOption(rawOptions.last);
      const page = parsePageOption(rawOptions.page, '--page') ?? 1;
      const pageSize = parsePageOption(rawOptions.pageSize, '--page-size') ?? last;
      const order = rawOptions.order ?? 'desc';
      if (order !== 'asc' && order !== 'desc') {
        throw new CliUsageError('--order must be asc or desc.');
      }

      const sessionId = requireOptionValue(rawOptions.sessionId, '--session-id');
      const context = createCommandContext(this, dependencies);

      const response = await context.api.getSessionMessages(
        sessionId,
        pageSize === undefined ? { page, order } : { page, pageSize, order },
      );

      if (rawOptions.pendingQuestion) {
        const pending = findPendingQuestion(response.messages);
        if (!pending) {
          throw new CliNotFoundError(`No pending question in session ${sessionId}.`);
        }

        if (context.outputJson) {
          context.io.stdout(formatJson({ sessionId, messageId: pending.messageId, userQuestion: pending.userQuestion }));
          return;
        }

        context.io.stdout(formatPendingQuestionHuman(pending));
        return;
      }

      if (context.outputJson) {
        context.io.stdout(formatJson(response));
        return;
      }

      context.io.stdout(formatSessionMessagesHuman(response));
    });
}

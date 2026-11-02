import { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionMessagesHuman } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';

/** Raw options of `proposal messages` and `hagitask messages`. */
export type SessionMessagesOptions = {
  sessionId: string;
  last?: string;
  json?: boolean;
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

/**
 * Registers a `messages` command that reads a session's messages, newest first. `--last n` asks the backend for the n
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
    .option('--last <n>', 'Read only the n newest messages. Omit it to read the backend default page (50 messages).')
    .action(async function sessionMessagesAction(this: Command, rawOptions: SessionMessagesOptions) {
      const last = parseLastOption(rawOptions.last);
      const sessionId = requireOptionValue(rawOptions.sessionId, '--session-id');
      const context = createCommandContext(this, dependencies);

      const response = await context.api.getSessionMessages(
        sessionId,
        last === undefined ? { page: 1, order: 'desc' } : { page: 1, pageSize: last, order: 'desc' },
      );

      if (context.outputJson) {
        context.io.stdout(formatJson(response));
        return;
      }

      context.io.stdout(formatSessionMessagesHuman(response));
    });
}

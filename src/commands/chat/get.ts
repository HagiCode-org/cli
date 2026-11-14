import { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionSummaryHuman, toSessionView } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export function registerChatGetCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('get')
      .description('Read one chat session by id without starting or waiting for a run.'),
  )
    .requiredOption('--session-id <id>', 'Session id to read.')
    .action(async function chatGetAction(this: Command, options: { sessionId: string }) {
      const sessionId = requireOptionValue(options.sessionId, '--session-id');
      const context = createCommandContext(this, dependencies);
      const session = toSessionView(await context.api.getSession(sessionId));

      context.io.stdout(context.outputJson ? formatJson({ session }) : formatSessionSummaryHuman(session));
    });
}

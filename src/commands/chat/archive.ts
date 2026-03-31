import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

type ChatArchiveOptions = {
  sessionId: string;
  json?: boolean;
};

export function registerChatArchiveCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('archive')
      .description('Archive a chat session through the dedicated chat archive endpoint.'),
  )
    .requiredOption('--session-id <id>', 'Chat session id to archive.')
    .action(async function chatArchiveAction(this: Command, options: ChatArchiveOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const response = await context.api.archiveChat(sessionId);

      if (context.outputJson) {
        context.io.stdout(formatJson({ sessionId, message: response.message }));
        return;
      }

      context.io.stdout(`Chat archived\nsessionId  ${sessionId}\nmessage    ${response.message}\n`);
    });
}

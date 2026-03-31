import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

type ChatDeleteOptions = {
  sessionId: string;
  json?: boolean;
};

export function registerChatDeleteCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('delete')
      .description('Delete a chat session.'),
  )
    .requiredOption('--session-id <id>', 'Chat session id to delete.')
    .action(async function chatDeleteAction(this: Command, options: ChatDeleteOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const response = await context.api.deleteSession(sessionId, false);

      if (context.outputJson) {
        context.io.stdout(formatJson({ sessionId, deleted: true, message: response.message }));
        return;
      }

      context.io.stdout(`Chat deleted\nsessionId  ${sessionId}\nmessage    ${response.message}\n`);
    });
}

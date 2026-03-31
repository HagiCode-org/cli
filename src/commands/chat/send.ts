import { Command, Option } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionMessageHuman } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { PCode_Models_AIProviderType } from '../../generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../generated/api/models/PCode_Models_MessageMode';

type ChatSendOptions = {
  sessionId: string;
  content: string;
  mode?: PCode_Models_MessageMode;
  executorType?: PCode_Models_AIProviderType;
  json?: boolean;
};

export function registerChatSendCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('send')
      .description('Send a follow-up message to a chat session.'),
  )
    .requiredOption('--session-id <id>', 'Chat session id.')
    .requiredOption('--content <text>', 'Message content.')
    .addOption(
      new Option('--mode <mode>', 'Message mode override.')
        .choices(Object.values(PCode_Models_MessageMode)),
    )
    .addOption(
      new Option('--executor-type <type>', 'Executor override for this message.')
        .choices(Object.values(PCode_Models_AIProviderType)),
    )
    .action(async function chatSendAction(this: Command, options: ChatSendOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const response = await context.api.sendMessage(sessionId, {
        content: requireOptionValue(options.content, '--content'),
        mode: options.mode,
        executorType: options.executorType,
      });

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          message: response.message,
          requested: {
            mode: options.mode,
            executorType: options.executorType,
          },
        }));
        return;
      }

      context.io.stdout(formatSessionMessageHuman('Chat message sent', sessionId, response, [
        ['mode', options.mode],
        ['executorType', options.executorType],
      ]));
    });
}

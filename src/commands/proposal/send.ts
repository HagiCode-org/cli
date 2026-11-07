import { Command, Option } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatSessionMessageHuman, toSteerJson } from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { noSteerOption, sendSessionMessage, steerOption } from '../../runtime/sendSteer';
import { PCode_Models_AIProviderType } from '../../generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../generated/api/models/PCode_Models_MessageMode';

type ProposalSendOptions = {
  sessionId: string;
  content: string;
  mode?: PCode_Models_MessageMode;
  executorType?: PCode_Models_AIProviderType;
  steer?: boolean;
  json?: boolean;
};

export function registerProposalSendCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('send')
      .description('Send a follow-up message to a proposal session.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id.')
    .requiredOption('--content <text>', 'Message content.')
    .addOption(new Option('--mode <mode>', 'Message mode override.').choices(Object.values(PCode_Models_MessageMode)))
    .addOption(
      new Option('--executor-type <type>', 'Executor override for this message.')
        .choices(Object.values(PCode_Models_AIProviderType)),
    )
    .addOption(steerOption())
    .addOption(noSteerOption())
    .action(async function proposalSendAction(this: Command, options: ProposalSendOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const sent = await sendSessionMessage({
        context,
        sessionId,
        content: requireOptionValue(options.content, '--content'),
        mode: options.mode,
        executorType: options.executorType,
        steerFlag: options.steer,
      });

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          message: sent.message,
          requested: {
            mode: options.mode,
            executorType: options.executorType,
          },
          steer: toSteerJson(sent.steer),
        }));
        return;
      }

      context.io.stdout(formatSessionMessageHuman('Proposal message sent', sessionId, { message: sent.message }, [
        ['mode', options.mode],
        ['executorType', options.executorType],
      ], sent.steer));
    });
}

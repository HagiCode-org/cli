import { Command, Option } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatSessionSummaryHuman,
  toSessionView,
} from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { PCode_Models_AIProviderType } from '../../generated/api/models/PCode_Models_AIProviderType';

type ChatCreateOptions = {
  title: string;
  projectId: string;
  heroId?: string;
  executorType?: PCode_Models_AIProviderType;
  json?: boolean;
};

export function registerChatCreateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('create')
      .description('Create a normal chat session.'),
  )
    .requiredOption('--title <title>', 'Chat session title.')
    .requiredOption('--project-id <id>', 'Owning project id.')
    .option('--hero-id <id>', 'Optional bound hero id.')
    .addOption(
      new Option('--executor-type <type>', 'Optional executor override.')
        .choices(Object.values(PCode_Models_AIProviderType)),
    )
    .action(async function chatCreateAction(this: Command, options: ChatCreateOptions) {
      const context = createCommandContext(this, dependencies);
      const session = await context.api.createChatSession({
        title: requireOptionValue(options.title, '--title'),
        projectId: requireOptionValue(options.projectId, '--project-id'),
        heroId: normalizeOptionalString(options.heroId),
        executorType: options.executorType,
      });

      const view = toSessionView(session);
      if (context.outputJson) {
        context.io.stdout(formatJson({ session: view }));
        return;
      }

      context.io.stdout(`Chat session created\n${formatSessionSummaryHuman(view)}`);
    });
}

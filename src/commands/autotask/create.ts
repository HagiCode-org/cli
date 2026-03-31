import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatSessionSummaryHuman,
  toSessionView,
} from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  normalizeOptionalStringArray,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';

type AutoTaskCreateOptions = {
  title: string;
  projectId: string;
  promptId: string;
  message?: string;
  presetId?: string;
  repositoryPath?: string;
  projectIds?: string[];
  needPush?: boolean;
  targetBranchMode?: string;
  targetBranchName?: string;
  scriptKey?: string;
  heroId?: string;
  json?: boolean;
};

export function registerAutoTaskCreateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('create')
      .description('Create an AutoTask session through the dedicated generated endpoint.'),
  )
    .requiredOption('--title <title>', 'AutoTask session title.')
    .requiredOption('--project-id <id>', 'Owning project id.')
    .requiredOption('--prompt-id <id>', 'Prompt template id.')
    .option('--message <text>', 'Optional custom message override.')
    .option('--preset-id <id>', 'Optional preset id.')
    .option('--repository-path <path>', 'Optional MonoSpecs repository path.')
    .option('--project-ids <ids...>', 'Optional extra project ids for multi-project flows.')
    .option('--need-push', 'Request push after commit creation when supported.')
    .option('--target-branch-mode <mode>', 'Optional target branch mode.')
    .option('--target-branch-name <name>', 'Optional custom target branch name.')
    .option('--script-key <key>', 'Optional stable dungeon script key.')
    .option('--hero-id <id>', 'Optional preferred hero id.')
    .action(async function autoTaskCreateAction(this: Command, options: AutoTaskCreateOptions) {
      if (options.targetBranchName && options.targetBranchMode !== 'new-custom') {
        throw new CliUsageError('--target-branch-name requires --target-branch-mode new-custom.');
      }

      if (options.targetBranchMode === 'new-custom' && !normalizeOptionalString(options.targetBranchName)) {
        throw new CliUsageError('--target-branch-name is required when --target-branch-mode is new-custom.');
      }

      const context = createCommandContext(this, dependencies);
      const request = {
        title: requireOptionValue(options.title, '--title'),
        projectId: requireOptionValue(options.projectId, '--project-id'),
        promptId: requireOptionValue(options.promptId, '--prompt-id'),
        message: normalizeOptionalString(options.message),
        presetId: normalizeOptionalString(options.presetId),
        repositoryPath: normalizeOptionalString(options.repositoryPath),
        projectIds: normalizeOptionalStringArray(options.projectIds),
        needPush: options.needPush ? true : undefined,
        targetBranchMode: normalizeOptionalString(options.targetBranchMode),
        targetBranchName: normalizeOptionalString(options.targetBranchName),
        scriptKey: normalizeOptionalString(options.scriptKey),
        heroId: normalizeOptionalString(options.heroId),
      };

      const session = await context.api.createAutoTaskSession(request);
      const view = toSessionView(session);

      if (context.outputJson) {
        context.io.stdout(formatJson({
          session: view,
          promptId: request.promptId,
          requested: request,
        }));
        return;
      }

      context.io.stdout(`AutoTask session created\n${formatSessionSummaryHuman(view, [
        ['promptId', request.promptId],
        ['repositoryPath', request.repositoryPath],
        ['targetBranchMode', request.targetBranchMode],
        ['targetBranchName', request.targetBranchName],
        ['scriptKey', request.scriptKey],
        ['heroId', request.heroId],
      ])}`);
    });
}

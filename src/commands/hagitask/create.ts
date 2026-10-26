import type { Command } from 'commander';
import type { PCode_Web_Controllers_CreateHagiTaskSessionRequest } from '../../generated/api/models/PCode_Web_Controllers_CreateHagiTaskSessionRequest';
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
import { loadStructuredJson } from '../../runtime/inputLoader';

type HagiTaskCreateOptions = {
  title: string;
  projectId: string;
  taskId?: string;
  promptId?: string;
  input?: string;
  message?: string;
  locale?: string;
  repositoryPath?: string;
  targetType?: string;
  vaultId?: string;
  outputVaultId?: string;
  referenceVaultId?: string[];
  editableVaultId?: string[];
  heroId?: string;
  heroSelectionMode?: string;
  needPush?: boolean;
  pullRebase?: boolean;
  targetBranchMode?: string;
  targetBranchName?: string;
  scriptKey?: string;
  json?: boolean;
};

const HERO_SELECTION_MODES = ['first', 'random'];

/**
 * Loads the structured task input from `--input <file>` or `--input -`. Missing, unreadable and non-object input
 * are usage errors, so none of them reaches the backend. The CLI does not check the keys; the backend does.
 */
export async function loadHagiTaskInput(source: string): Promise<Record<string, unknown>> {
  let loaded: unknown;
  try {
    loaded = await loadStructuredJson<unknown>(source);
  } catch (error) {
    if (error instanceof CliUsageError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new CliUsageError(`Cannot read HagiTask input from ${source}: ${message}`);
  }

  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new CliUsageError(`HagiTask input from ${source} must be a JSON object.`);
  }

  return loaded as Record<string, unknown>;
}

/** Usage rules that are checked before any network call. */
function validateCreateOptions(options: HagiTaskCreateOptions, taskId?: string, promptId?: string): void {
  if (!taskId && !promptId) {
    throw new CliUsageError('Provide --task-id or --prompt-id.');
  }

  if (options.input !== undefined && !taskId) {
    throw new CliUsageError('--input requires --task-id.');
  }

  if (options.targetBranchName && options.targetBranchMode !== 'new-custom') {
    throw new CliUsageError('--target-branch-name requires --target-branch-mode new-custom.');
  }

  if (options.targetBranchMode === 'new-custom' && !normalizeOptionalString(options.targetBranchName)) {
    throw new CliUsageError('--target-branch-name is required when --target-branch-mode is new-custom.');
  }

  const heroSelectionMode = normalizeOptionalString(options.heroSelectionMode);
  if (heroSelectionMode && !HERO_SELECTION_MODES.includes(heroSelectionMode)) {
    throw new CliUsageError('--hero-selection-mode must be first or random.');
  }
}

export function registerHagiTaskCreateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('create')
      .description('Create a HagiTask session. Read the task schema first with `hagitask schema --task-id <id>`, then pass the input JSON with --input.'),
  )
    .requiredOption('--title <title>', 'HagiTask session title.')
    .requiredOption('--project-id <id>', 'Owning project id.')
    .option('--task-id <id>', 'HagiTask id from `hagitask list`. Required with --input.')
    .option('--prompt-id <id>', 'Prompt template id, for example auto-compose-commit.en-US. Used when there is no --task-id.')
    .option('--input <file|->', 'Structured task input: a JSON object file, or - to read it from stdin. Needs --task-id.')
    .option('--message <text>', 'Optional message that overrides the prompt template.')
    .option('--locale <locale>', 'Locale for the HagiTask prompt, for example en-US.')
    .option('--repository-path <path>', 'Optional MonoSpecs sub-repository path, for example repos/cli.')
    .option('--target-type <type>', 'Explicit target type: repository or vault.')
    .option('--vault-id <id>', 'Registered vault id for vault-targeted execution.')
    .option('--output-vault-id <id>', 'Output vault id for research-investigation tasks.')
    .option('--reference-vault-id <ids...>', 'Reference vault ids the session may read.')
    .option('--editable-vault-id <ids...>', 'Vault ids the session may edit.')
    .option('--hero-id <id>', 'Preferred hero id. Takes precedence over --hero-selection-mode.')
    .option('--hero-selection-mode <mode>', 'Hero choice when --hero-id is not given: first (default) or random.')
    .option('--need-push', 'Request a push after commit creation when supported.')
    .option('--pull-rebase', 'Run git pull --rebase before pushing, when push is requested.')
    .option('--target-branch-mode <mode>', 'Optional target branch mode, for example current or new-custom.')
    .option('--target-branch-name <name>', 'Custom target branch name. Requires --target-branch-mode new-custom.')
    .option('--script-key <key>', 'Optional stable scenario script key.')
    .action(async function hagiTaskCreateAction(this: Command, options: HagiTaskCreateOptions) {
      const taskId = normalizeOptionalString(options.taskId);
      const promptId = normalizeOptionalString(options.promptId);
      validateCreateOptions(options, taskId, promptId);

      const presetTaskInput = options.input !== undefined
        ? await loadHagiTaskInput(requireOptionValue(options.input, '--input'))
        : undefined;

      const context = createCommandContext(this, dependencies);
      const request: PCode_Web_Controllers_CreateHagiTaskSessionRequest = {
        title: requireOptionValue(options.title, '--title'),
        projectId: requireOptionValue(options.projectId, '--project-id'),
        promptId,
        presetTaskId: taskId,
        presetTaskLocale: normalizeOptionalString(options.locale),
        presetTaskInput,
        message: normalizeOptionalString(options.message),
        repositoryPath: normalizeOptionalString(options.repositoryPath),
        targetType: normalizeOptionalString(options.targetType),
        vaultId: normalizeOptionalString(options.vaultId),
        outputVaultId: normalizeOptionalString(options.outputVaultId),
        referenceVaultIds: normalizeOptionalStringArray(options.referenceVaultId),
        editableVaultIds: normalizeOptionalStringArray(options.editableVaultId),
        heroId: normalizeOptionalString(options.heroId),
        heroSelectionMode: normalizeOptionalString(options.heroSelectionMode),
        needPush: options.needPush ? true : undefined,
        pullRebaseBeforePush: options.pullRebase ? true : undefined,
        targetBranchMode: normalizeOptionalString(options.targetBranchMode),
        targetBranchName: normalizeOptionalString(options.targetBranchName),
        scriptKey: normalizeOptionalString(options.scriptKey),
      };

      // Only a session the backend returned is reported as created. A rejection propagates unchanged.
      const session = await context.api.createHagiTaskSession(request);
      const view = toSessionView(session);

      if (context.outputJson) {
        context.io.stdout(formatJson({
          session: view,
          presetTaskId: request.presetTaskId ?? null,
          promptId: request.promptId ?? null,
          requested: request,
        }));
        return;
      }

      context.io.stdout(`HagiTask session created\n${formatSessionSummaryHuman(view, [
        ['presetTaskId', request.presetTaskId ?? undefined],
        ['presetTaskLocale', request.presetTaskLocale ?? undefined],
        ['promptId', request.promptId ?? undefined],
        ['repositoryPath', request.repositoryPath ?? undefined],
        ['targetBranchMode', request.targetBranchMode ?? undefined],
        ['targetBranchName', request.targetBranchName ?? undefined],
        ['scriptKey', request.scriptKey ?? undefined],
        ['heroId', request.heroId ?? undefined],
        ['heroSelectionMode', request.heroSelectionMode ?? undefined],
      ])}`);
    });
}

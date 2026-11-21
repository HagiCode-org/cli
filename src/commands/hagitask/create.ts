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
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { parseHeroReference } from '../../runtime/heroReference';
import { loadStructuredJson } from '../../runtime/inputLoader';
import type { HagiApi } from '../../runtime/hagiApi';
import {
  buildHagiTaskScope,
  type HagiTaskScopeRequest,
  parseScopeFlags,
  repositorySelectionIdsOf,
  scopeFlagNames,
  scopeNeedsSelectionIds,
} from '../../runtime/hagitaskScope';

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
  repository?: string[];
  allRepositories?: string[];
  project?: string[];
  outputVaultId?: string;
  referenceVaultId?: string[];
  editableVaultId?: string[];
  heroId?: string;
  hero?: string;
  heroSelectionMode?: string;
  needPush?: boolean;
  pullRebase?: boolean;
  targetBranchMode?: string;
  targetBranchName?: string;
  scriptKey?: string;
  json?: boolean;
};

const HERO_SELECTION_MODES = ['first', 'random'];

/** Collects a repeatable option into an array. */
function collectOption(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

/**
 * Takes a top-level `scope` key out of the --input object. The key becomes the request scope, and the rest of the object
 * stays the preset task input unchanged. A scope flag in the same run is a usage error: the two sources are never merged.
 */
export function liftScopeFromInput(
  input: Record<string, unknown> | undefined,
  flagNames: readonly string[],
): { presetTaskInput: Record<string, unknown> | undefined; scope?: HagiTaskScopeRequest } {
  if (!input || !Object.prototype.hasOwnProperty.call(input, 'scope')) {
    return { presetTaskInput: input };
  }

  if (flagNames.length > 0) {
    throw new CliUsageError(
      `--input scope and ${flagNames[0]} both give the scope. Use one: remove the "scope" key from --input, or remove ${flagNames.join(', ')}.`,
    );
  }

  const { scope, ...rest } = input;
  if (!scope || typeof scope !== 'object' || Array.isArray(scope)) {
    throw new CliUsageError('--input scope must be a JSON object.');
  }

  return { presetTaskInput: rest, scope: scope as HagiTaskScopeRequest };
}

/** Reads the repository selection ids of a task. Called only when a repository flag has no selection id. */
async function readRepositorySelectionIds(api: HagiApi, taskId: string): Promise<string[]> {
  return repositorySelectionIdsOf(await api.getHagiTaskSchema(taskId));
}

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

  if (options.hero !== undefined && options.heroId !== undefined) {
    throw new CliUsageError('--hero and --hero-id cannot be given together; use one of them.');
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
    .option('--repository <[selection=]path:access>', 'Repository the session may use, for example repos/web:write. Repeat for more. Without a selection id the task must have one repository selection; with several, prefix the id: targetRepositories=repos/web:write.', collectOption, [])
    .option('--all-repositories <[selection=]access>', 'Every repository of the project for a repository selection, for example --all-repositories read. Cannot be combined with --repository on the same selection.', collectOption, [])
    .option('--project <project-id:access>', 'Another project the session may use, for example <project-id>:read. Repeat for more.', collectOption, [])
    .option('--output-vault-id <id>', 'Output vault id for research-investigation tasks (scope.vaults.output).')
    .option('--reference-vault-id <ids...>', 'Reference vault ids the session may read (scope.vaults.reference).')
    .option('--editable-vault-id <ids...>', 'Vault ids the session may edit (scope.vaults.editable).')
    .option('--hero-id <id>', 'Preferred hero id. Takes precedence over --hero-selection-mode.')
    .option('--hero <name-or-id>', 'Preferred hero by name or ID. A GUID is an ID, any other value is a name; cannot be combined with --hero-id.')
    .option('--hero-selection-mode <mode>', 'Hero choice when no --hero or --hero-id is given: first (default) or random.')
    .option('--need-push', 'Request a push after commit creation when supported.')
    .option('--pull-rebase', 'Run git pull --rebase before pushing, when push is requested.')
    .option('--target-branch-mode <mode>', 'Target branch mode: current, new-custom or ai-generated-new. new-custom needs --target-branch-name.')
    .option('--target-branch-name <name>', 'Custom target branch name. Requires --target-branch-mode new-custom.')
    .option('--script-key <key>', 'Optional stable scenario script key.')
    .action(async function hagiTaskCreateAction(this: Command, options: HagiTaskCreateOptions) {
      const taskId = normalizeOptionalString(options.taskId);
      const promptId = normalizeOptionalString(options.promptId);
      validateCreateOptions(options, taskId, promptId);
      const hero = options.hero !== undefined ? parseHeroReference(options.hero) : undefined;

      const scopeFlags = parseScopeFlags({
        repository: options.repository,
        allRepositories: options.allRepositories,
        project: options.project,
        outputVaultId: options.outputVaultId,
        referenceVaultId: options.referenceVaultId,
        editableVaultId: options.editableVaultId,
      });
      const loadedInput = options.input !== undefined
        ? await loadHagiTaskInput(requireOptionValue(options.input, '--input'))
        : undefined;
      const lifted = liftScopeFromInput(loadedInput, scopeFlagNames(scopeFlags));

      // Every usage rule above runs before the one schema read below, and before any create request.
      if (scopeNeedsSelectionIds(scopeFlags) && !taskId) {
        throw new CliUsageError('A repository flag without a selection id needs --task-id, so the task\'s repository selection can be read. Pass <selection id>=<value> to skip the read.');
      }

      const context = createCommandContext(this, dependencies);
      const repositorySelectionIds = scopeNeedsSelectionIds(scopeFlags) && taskId
        ? await readRepositorySelectionIds(context.api, taskId)
        : undefined;
      const flagScope = buildHagiTaskScope(scopeFlags, repositorySelectionIds);

      const request: PCode_Web_Controllers_CreateHagiTaskSessionRequest = {
        title: requireOptionValue(options.title, '--title'),
        projectId: requireOptionValue(options.projectId, '--project-id'),
        promptId,
        presetTaskId: taskId,
        presetTaskLocale: normalizeOptionalString(options.locale),
        presetTaskInput: lifted.presetTaskInput,
        scope: flagScope ?? lifted.scope,
        message: normalizeOptionalString(options.message),
        repositoryPath: normalizeOptionalString(options.repositoryPath),
        targetType: normalizeOptionalString(options.targetType),
        vaultId: normalizeOptionalString(options.vaultId),
        heroId: hero && 'heroId' in hero ? hero.heroId : normalizeOptionalString(options.heroId),
        heroName: hero && 'heroName' in hero ? hero.heroName : undefined,
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
          scope: request.scope ?? null,
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
        ['heroName', request.heroName ?? undefined],
        ['heroSelectionMode', request.heroSelectionMode ?? undefined],
      ])}`);
    });
}

import type {
  PCode_Application_Contracts_Sessions_HagiTaskRepositoryScopeDto,
  PCode_Application_Contracts_Sessions_HagiTaskScopeDto,
} from '../generated/api/models/PCode_Application_Contracts_Sessions_HagiTaskScopeDto';
import type { PCode_Web_Controllers_PresetTaskCreationSchemaDto } from '../generated/api/models/PCode_Web_Controllers_PresetTaskCreationSchemaDto';
import { normalizeOptionalString, normalizeOptionalStringArray } from './commandContext';
import { CliUsageError } from './errors';

/**
 * Builds the HagiTask request `scope` from the scope flags of `hagitask create`. The functions are pure: they read no
 * config and make no network call. A repository flag without a selection id needs the task's repository selection ids,
 * which the caller reads from the creation schema only when parseScopeFlags reports that one is needed.
 */

export const SCOPE_ACCESS_TYPES = ['read', 'write'] as const;
export type ScopeAccessType = (typeof SCOPE_ACCESS_TYPES)[number];

/** Raw scope flag values, as commander collected them. */
export type ScopeFlagValues = {
  repository?: string[];
  allRepositories?: string[];
  project?: string[];
  outputVaultId?: string;
  referenceVaultId?: string[];
  editableVaultId?: string[];
};

export type ParsedRepositoryFlag = { selectionId?: string; path: string; accessType: ScopeAccessType };
export type ParsedAllRepositoriesFlag = { selectionId?: string; accessType: ScopeAccessType };
export type ParsedProjectFlag = { projectId: string; accessType: ScopeAccessType };

/** Scope flags after their values are checked. Only the usage rules that need no schema are applied here. */
export type ParsedScopeFlags = {
  repositories: ParsedRepositoryFlag[];
  allRepositories: ParsedAllRepositoriesFlag[];
  projects: ParsedProjectFlag[];
  outputVaultId?: string;
  referenceVaultIds: string[];
  editableVaultIds: string[];
};

export type HagiTaskScopeRequest = PCode_Application_Contracts_Sessions_HagiTaskScopeDto;

function parseAccessType(flag: string, value: string, accessText: string): ScopeAccessType {
  const normalized = accessText.trim();
  if (!(SCOPE_ACCESS_TYPES as readonly string[]).includes(normalized)) {
    throw new CliUsageError(`${flag} ${value}: access must be read or write, not "${normalized}".`);
  }

  return normalized as ScopeAccessType;
}

/** Splits an optional `<selection id>=` prefix off a flag value. The first `=` separates it, so paths cannot contain `=`. */
function splitSelectionPrefix(flag: string, value: string): { selectionId?: string; rest: string } {
  const separator = value.indexOf('=');
  if (separator < 0) {
    return { rest: value };
  }

  const selectionId = value.slice(0, separator).trim();
  if (!selectionId) {
    throw new CliUsageError(`${flag} ${value}: the selection id before "=" is empty.`);
  }

  return { selectionId, rest: value.slice(separator + 1) };
}

/** `[<selection id>=]<path>:<read|write>`. The access follows the last `:`. */
export function parseRepositoryFlag(value: string): ParsedRepositoryFlag {
  const flag = '--repository';
  const { selectionId, rest } = splitSelectionPrefix(flag, value);
  const colon = rest.lastIndexOf(':');
  if (colon < 0) {
    throw new CliUsageError(`${flag} ${value}: expected [<selection id>=]<path>:<read|write>.`);
  }

  const path = rest.slice(0, colon).trim();
  if (!path) {
    throw new CliUsageError(`${flag} ${value}: the repository path is empty.`);
  }

  return { selectionId, path, accessType: parseAccessType(flag, value, rest.slice(colon + 1)) };
}

/** `[<selection id>=]<read|write>`. */
export function parseAllRepositoriesFlag(value: string): ParsedAllRepositoriesFlag {
  const flag = '--all-repositories';
  const { selectionId, rest } = splitSelectionPrefix(flag, value);
  return { selectionId, accessType: parseAccessType(flag, value, rest) };
}

/** `<project id>:<read|write>`. The access follows the last `:`. */
export function parseProjectFlag(value: string): ParsedProjectFlag {
  const flag = '--project';
  const colon = value.lastIndexOf(':');
  if (colon < 0) {
    throw new CliUsageError(`${flag} ${value}: expected <project id>:<read|write>.`);
  }

  const projectId = value.slice(0, colon).trim();
  if (!projectId) {
    throw new CliUsageError(`${flag} ${value}: the project id is empty.`);
  }

  return { projectId, accessType: parseAccessType(flag, value, value.slice(colon + 1)) };
}

/** Checks every scope flag value. Throws a usage error that names the flag and the value; sends nothing. */
export function parseScopeFlags(flags: ScopeFlagValues): ParsedScopeFlags {
  return {
    repositories: (flags.repository ?? []).map(parseRepositoryFlag),
    allRepositories: (flags.allRepositories ?? []).map(parseAllRepositoriesFlag),
    projects: (flags.project ?? []).map(parseProjectFlag),
    outputVaultId: normalizeOptionalString(flags.outputVaultId),
    referenceVaultIds: normalizeOptionalStringArray(flags.referenceVaultId) ?? [],
    editableVaultIds: normalizeOptionalStringArray(flags.editableVaultId) ?? [],
  };
}

/** The flags that build `scope` and were given, for messages. Empty when the command has no scope flag. */
export function scopeFlagNames(parsed: ParsedScopeFlags): string[] {
  const names: string[] = [];
  if (parsed.repositories.length > 0) names.push('--repository');
  if (parsed.allRepositories.length > 0) names.push('--all-repositories');
  if (parsed.projects.length > 0) names.push('--project');
  if (parsed.outputVaultId !== undefined) names.push('--output-vault-id');
  if (parsed.referenceVaultIds.length > 0) names.push('--reference-vault-id');
  if (parsed.editableVaultIds.length > 0) names.push('--editable-vault-id');
  return names;
}

/**
 * True when a repository flag has no selection id, so the caller must read the task's selection ids (one read) and pass
 * them to buildHagiTaskScope. Without one, no read is made.
 */
export function scopeNeedsSelectionIds(parsed: ParsedScopeFlags): boolean {
  return parsed.repositories.some(item => item.selectionId === undefined)
    || parsed.allRepositories.some(item => item.selectionId === undefined);
}

/** The repository selection ids of a task's creation schema, in the schema's order. */
export function repositorySelectionIdsOf(schema: PCode_Web_Controllers_PresetTaskCreationSchemaDto): string[] {
  return (schema.scope?.targets ?? [])
    .filter(target => target.kind?.toLowerCase() === 'repositories' && Boolean(target.id))
    .map(target => target.id as string);
}

/** The selection id a flag without a prefix stands for: the task's only repository selection. */
function resolveSelectionId(
  flag: string,
  selectionId: string | undefined,
  selectionIds: readonly string[] | undefined,
): string {
  if (selectionId !== undefined) {
    return selectionId;
  }

  if (!selectionIds) {
    throw new CliUsageError(`${flag} needs a selection id: pass <selection id>=<value>, or --task-id so the selection can be read.`);
  }

  if (selectionIds.length === 1) {
    return selectionIds[0];
  }

  if (selectionIds.length === 0) {
    throw new CliUsageError(`${flag} needs a repository selection, but this task declares none. Remove ${flag} or check the task with \`hagi hagitask schema\`.`);
  }

  throw new CliUsageError(
    `${flag} needs a selection id: this task declares ${selectionIds.length} repository selections (${selectionIds.join(', ')}). Use ${flag} <selection id>=<value>.`,
  );
}

/**
 * Builds the request `scope` from parsed scope flags, or returns undefined when none was given. The usage rules that
 * need the selection ids are checked here: a selection given as both --repository and --all-repositories, a repeated
 * --all-repositories, and a repeated path in one selection. Nothing is sent when one of them fails.
 */
export function buildHagiTaskScope(
  parsed: ParsedScopeFlags,
  repositorySelectionIds?: readonly string[],
): HagiTaskScopeRequest | undefined {
  if (scopeFlagNames(parsed).length === 0) {
    return undefined;
  }

  const repositories: Record<string, PCode_Application_Contracts_Sessions_HagiTaskRepositoryScopeDto> = {};
  const seenPaths = new Map<string, Set<string>>();

  for (const item of parsed.repositories) {
    const selectionId = resolveSelectionId('--repository', item.selectionId, repositorySelectionIds);
    const paths = seenPaths.get(selectionId) ?? new Set<string>();
    if (paths.has(item.path)) {
      throw new CliUsageError(`--repository repeats the path "${item.path}" for selection "${selectionId}".`);
    }

    paths.add(item.path);
    seenPaths.set(selectionId, paths);
    const existing = repositories[selectionId];
    repositories[selectionId] = {
      mode: 'explicit',
      items: [...(existing?.items ?? []), { path: item.path, accessType: item.accessType }],
    };
  }

  for (const item of parsed.allRepositories) {
    const selectionId = resolveSelectionId('--all-repositories', item.selectionId, repositorySelectionIds);
    const existing = repositories[selectionId];
    if (existing?.mode === 'all') {
      throw new CliUsageError(`--all-repositories is given twice for selection "${selectionId}".`);
    }

    if (existing) {
      throw new CliUsageError(`--repository and --all-repositories cannot be given for the same selection ("${selectionId}").`);
    }

    repositories[selectionId] = { mode: 'all', accessType: item.accessType };
  }

  return {
    repositories,
    vaults: {
      output: parsed.outputVaultId,
      reference: parsed.referenceVaultIds,
      editable: parsed.editableVaultIds,
    },
    projects: parsed.projects.map(item => ({ projectId: item.projectId, accessType: item.accessType })),
  };
}

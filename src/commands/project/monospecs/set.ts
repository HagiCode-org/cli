import type { Command } from 'commander';
import {
  formatMonoSpecsCloneHuman,
  formatMonoSpecsDocumentHuman,
  toMonoSpecsClonePayload,
  toMonoSpecsDocumentPayload,
} from '../../../formatters/monospecs';
import { formatJson } from '../../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
  type CommandContext,
} from '../../../runtime/commandContext';
import { CliOperationFailedError, CliUsageError } from '../../../runtime/errors';
import type { PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto } from '../../../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementDto } from '../../../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto } from '../../../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto';
import { collectOptionValue, normalizeRepositoryPath } from './shared';

export type ProjectMonoSpecsSetOptions = {
  id: string;
  version?: string;
  repoDirectory?: string;
  commitWhenArchive?: string;
  addRepository: string[];
  removeRepository: string[];
  url?: string;
  name?: string;
  displayName?: string;
  type?: string;
  clone?: boolean;
  json?: boolean;
};

const CHANGE_OPTIONS = '--version, --repo-directory, --commit-when-archive, --add-repository, --remove-repository';

/** Keeps only the configured fields of a repository. Local Git state is never written back. */
function toConfiguredRepository(
  repository: PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto,
): PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto {
  return {
    name: repository.name,
    code: repository.code,
    path: repository.path,
    url: repository.url,
    displayName: repository.displayName,
    type: repository.type,
    icon: repository.icon,
    optional: repository.optional,
    tags: repository.tags,
    metadata: repository.metadata,
  };
}

function lastPathSegment(path: string): string {
  return path.split('/').at(-1) ?? path;
}

function writeSavedDocument(
  context: CommandContext,
  document: PCode_Application_Contracts_Dto_MonoSpecsManagementDto,
  clone?: { results: PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto[] },
): void {
  const payload = toMonoSpecsDocumentPayload(document);
  const clonePayload = clone ? toMonoSpecsClonePayload(clone.results) : undefined;

  if (context.outputJson) {
    context.io.stdout(formatJson(clonePayload ? { ...payload, clone: clonePayload } : payload));
    return;
  }

  context.io.stdout(`MonoSpecs configuration saved.\n${formatMonoSpecsDocumentHuman(payload)}`);
  if (clonePayload) {
    context.io.stdout(`\nClone results\n${formatMonoSpecsCloneHuman(clonePayload)}`);
  }
}

export function registerProjectMonoSpecsSetCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('set')
      .description('Change the MonoSpecs metadata or repositories. Reads the document, applies the given options and saves it.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .option('--version <value>', 'MonoSpecs configuration version.')
    .option('--repo-directory <dir>', 'Repository directory relative to the project root.')
    .option('--commit-when-archive <true|false>', 'Whether archiving commits the MonoSpecs changes.')
    .option('--add-repository <path>', 'Configured repository path to add. Repeatable.', collectOptionValue, [])
    .option('--remove-repository <path>', 'Configured repository path to remove. Repeatable.', collectOptionValue, [])
    .option('--url <url>', 'Clone URL of the single added repository.')
    .option('--name <name>', 'Name of the single added repository. Defaults to the last path segment.')
    .option('--display-name <name>', 'Display name of the single added repository.')
    .option('--type <type>', 'Type of the single added repository.')
    .option('--clone', 'Clone the added repositories after saving. Requires at least one --add-repository.')
    .action(async function projectMonoSpecsSetAction(this: Command, options: ProjectMonoSpecsSetOptions) {
      const addPaths = options.addRepository.map(normalizeRepositoryPath);
      const removePaths = options.removeRepository.map(normalizeRepositoryPath);
      const hasMetadataChange = options.version !== undefined || options.repoDirectory !== undefined || options.commitWhenArchive !== undefined;

      if (!hasMetadataChange && addPaths.length === 0 && removePaths.length === 0) {
        throw new CliUsageError(`Provide at least one change: ${CHANGE_OPTIONS}.`);
      }

      if (options.clone && addPaths.length === 0) {
        throw new CliUsageError('--clone requires at least one --add-repository.');
      }

      const companionOptions = [
        options.url !== undefined ? '--url' : undefined,
        options.name !== undefined ? '--name' : undefined,
        options.displayName !== undefined ? '--display-name' : undefined,
        options.type !== undefined ? '--type' : undefined,
      ].filter(Boolean);
      if (companionOptions.length > 0 && addPaths.length !== 1) {
        throw new CliUsageError(`${companionOptions.join(', ')} apply to a single --add-repository only.`);
      }

      let commitWhenArchive: boolean | undefined;
      if (options.commitWhenArchive !== undefined) {
        if (options.commitWhenArchive !== 'true' && options.commitWhenArchive !== 'false') {
          throw new CliUsageError('--commit-when-archive must be true or false.');
        }
        commitWhenArchive = options.commitWhenArchive === 'true';
      }

      const context = createCommandContext(this, dependencies);
      const projectId = requireOptionValue(options.id, '--id');
      const current = await context.api.getMonoSpecsManagement(projectId);

      const repositories = (current.repositories ?? []).map(toConfiguredRepository);
      for (const path of removePaths) {
        const index = repositories.findIndex(repository => normalizeRepositoryPath(repository.path ?? '') === path);
        if (index < 0) {
          throw new CliUsageError(`Repository path ${path} is not configured, so it cannot be removed.`);
        }

        repositories.splice(index, 1);
      }

      for (const path of addPaths) {
        if (repositories.some(repository => normalizeRepositoryPath(repository.path ?? '') === path)) {
          throw new CliUsageError(`Repository path ${path} is already configured.`);
        }

        repositories.push({
          name: options.name ?? lastPathSegment(path),
          code: null,
          path,
          url: options.url ?? null,
          displayName: options.displayName ?? null,
          type: options.type ?? null,
          icon: null,
          optional: false,
          tags: [],
          metadata: [],
        });
      }

      const saved = await context.api.saveMonoSpecsManagement(projectId, {
        version: options.version ?? current.version,
        repoDirectory: options.repoDirectory ?? current.repoDirectory,
        commitWhenArchive: commitWhenArchive ?? current.commitWhenArchive,
        repositories,
        metadata: current.metadata ?? [],
      });

      if (!options.clone) {
        writeSavedDocument(context, saved);
        return;
      }

      // The configuration is already saved; a failed clone leaves it in place and reports exit 30.
      let results: PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto[];
      try {
        const response = await context.api.cloneMonoSpecsRepositories(projectId, { paths: addPaths, includeOptional: false });
        results = response.results ?? [];
      } catch (error) {
        writeSavedDocument(context, saved);
        throw error;
      }

      writeSavedDocument(context, saved, { results });
      const failed = results.filter(result => result.status === 'failed');
      if (failed.length > 0) {
        throw new CliOperationFailedError(
          `The configuration was saved, but ${failed.length} repository clone(s) failed. See the clone results above.`,
        );
      }
    });
}

import type { Command } from 'commander';
import { formatJson } from '../../../formatters/json';
import {
  formatMonoSpecsCloneHuman,
  toMonoSpecsClonePayload,
} from '../../../formatters/monospecs';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { CliOperationFailedError } from '../../../runtime/errors';
import { collectOptionValue, normalizeRepositoryPath } from './shared';

export type ProjectMonoSpecsCloneOptions = {
  id: string;
  path: string[];
  includeOptional?: boolean;
  json?: boolean;
};

export function registerProjectMonoSpecsCloneCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('clone')
      .description('Clone the configured repositories that are missing on the backend host. Exits with code 30 when any clone fails.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .option('--path <path>', 'Configured repository path to clone. Repeatable; omit to clone every missing repository.', collectOptionValue, [])
    .option('--include-optional', 'Also clone optional repositories when no --path is given.')
    .action(async function projectMonoSpecsCloneAction(this: Command, options: ProjectMonoSpecsCloneOptions) {
      const paths = options.path.map(normalizeRepositoryPath);
      const context = createCommandContext(this, dependencies);
      const projectId = requireOptionValue(options.id, '--id');
      const includeOptional = options.includeOptional === true;

      const response = await context.api.cloneMonoSpecsRepositories(
        projectId,
        paths.length > 0 ? { paths, includeOptional } : { includeOptional },
      );
      const payload = toMonoSpecsClonePayload(response.results);
      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
      } else {
        context.io.stdout(formatMonoSpecsCloneHuman(payload));
      }

      const failed = payload.results.filter(result => result.status === 'failed');
      if (failed.length > 0) {
        throw new CliOperationFailedError(`${failed.length} repository clone(s) failed. See the results above.`);
      }
    });
}

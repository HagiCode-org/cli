import type { Command } from 'commander';
import { formatJson } from '../../../formatters/json';
import {
  formatMonoSpecsRemoveCheckoutHuman,
  toMonoSpecsRemoveCheckoutPayload,
} from '../../../formatters/monospecs';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { CliHttpError, normalizeCliError } from '../../../runtime/errors';
import { normalizeRepositoryPath } from './shared';

export type ProjectMonoSpecsRemoveCheckoutOptions = {
  id: string;
  path: string;
  force?: boolean;
  json?: boolean;
};

export function registerProjectMonoSpecsRemoveCheckoutCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('remove-checkout')
      .description('Delete the local checkout of one configured repository on the backend host. monospecs.yaml is not changed.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .requiredOption('--path <path>', 'Configured repository path whose local checkout to delete.')
    .option('--force', 'Delete the checkout even with uncommitted changes, unpushed commits or no upstream branch.')
    .action(async function projectMonoSpecsRemoveCheckoutAction(this: Command, options: ProjectMonoSpecsRemoveCheckoutOptions) {
      const context = createCommandContext(this, dependencies);
      const projectId = requireOptionValue(options.id, '--id');
      const path = normalizeRepositoryPath(requireOptionValue(options.path, '--path'));
      const force = options.force === true;

      let response;
      try {
        response = await context.api.removeMonoSpecsRepositoryCheckout(projectId, path, force);
      } catch (error) {
        const failure = normalizeCliError(error);
        // The backend only mentions `force` for conflicts it can override; a non-standalone refusal is not overridable.
        if (failure.status === 409 && !force && /force/i.test(failure.message)) {
          throw new CliHttpError(409, `${failure.message}\nRe-run with --force to delete this checkout anyway.`, failure.details);
        }

        throw error;
      }

      const payload = toMonoSpecsRemoveCheckoutPayload(response);
      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
      } else {
        context.io.stdout(formatMonoSpecsRemoveCheckoutHuman(payload));
      }
    });
}

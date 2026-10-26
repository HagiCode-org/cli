import type { Command } from 'commander';
import { formatJson } from '../../../formatters/json';
import {
  formatMonoSpecsValidationHuman,
  toMonoSpecsValidationPayload,
} from '../../../formatters/monospecs';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { CliHttpError, CliOperationFailedError } from '../../../runtime/errors';

export function registerProjectMonoSpecsValidateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('validate')
      .description('Validate the MonoSpecs configuration of a project. Exits with code 30 when it is invalid.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .action(async function projectMonoSpecsValidateAction(this: Command, options: { id: string }) {
      const context = createCommandContext(this, dependencies);
      const projectId = requireOptionValue(options.id, '--id');

      // The validation endpoint takes a project path, which is resolved from the aggregation snapshot.
      const aggregation = await context.api.listProjects();
      const project = (aggregation.projects ?? []).find(candidate => candidate.id === projectId);
      if (!project?.path) {
        throw new CliHttpError(404, `Project ${projectId} was not found in the aggregation snapshot.`);
      }

      const response = await context.api.validateMonoSpecs({ projectPath: project.path });
      const payload = toMonoSpecsValidationPayload(response);
      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
      } else {
        context.io.stdout(formatMonoSpecsValidationHuman(payload));
      }

      if (!payload.isValid) {
        throw new CliOperationFailedError('MonoSpecs configuration is invalid. See the errors above.');
      }
    });
}

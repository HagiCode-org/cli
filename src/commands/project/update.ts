import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatProjectSummaryHuman,
  formatProjectListPayload,
  toProjectView,
} from '../../formatters/project';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliHttpError, CliUsageError } from '../../runtime/errors';

export type ProjectUpdateOptions = {
  id: string;
  name?: string;
  path?: string;
  description?: string;
  clearDescription?: boolean;
  json?: boolean;
};

export function registerProjectUpdateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('update')
      .description('Update a project by merging provided fields into the aggregation snapshot.'),
  )
    .requiredOption('--id <id>', 'Project id to update.')
    .option('--name <name>', 'Updated project name.')
    .option('--path <path>', 'Updated project path.')
    .option('--description <text>', 'Updated project description.')
    .option('--clear-description', 'Clear the stored description.')
    .action(async function projectUpdateAction(this: Command, options: ProjectUpdateOptions) {
      if (!options.name && !options.path && !options.description && !options.clearDescription) {
        throw new CliUsageError('Provide at least one field to update: --name, --path, --description, or --clear-description.');
      }

      if (options.description && options.clearDescription) {
        throw new CliUsageError('Use either --description or --clear-description, not both.');
      }

      const context = createCommandContext(this, dependencies);
      const projectId = options.id.trim();
      const aggregation = await context.api.listProjects();
      const current = formatProjectListPayload(aggregation.projects).projects.find(project => project.id === projectId);
      if (!current) {
        throw new CliHttpError(404, `Project ${projectId} was not found in the aggregation snapshot.`);
      }

      const updated = await context.api.updateProject(projectId, {
        name: normalizeOptionalString(options.name) ?? current.name,
        path: normalizeOptionalString(options.path) ?? current.path,
        description: options.clearDescription ? null : normalizeOptionalString(options.description) ?? current.description ?? null,
      });

      const view = toProjectView(updated);
      if (context.outputJson) {
        context.io.stdout(formatJson({ project: view }));
        return;
      }

      context.io.stdout(`Project updated\n${formatProjectSummaryHuman(view)}`);
    });
}

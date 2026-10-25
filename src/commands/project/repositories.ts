import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatProjectRepositoriesHuman,
  toProjectRepositoriesPayload,
} from '../../formatters/project';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliHttpError } from '../../runtime/errors';

export type ProjectRepositoriesOptions = {
  id: string;
  json?: boolean;
};

export function registerProjectRepositoriesCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('repositories')
      .description('List the repositories of one project from the aggregation snapshot.'),
  )
    .requiredOption('--id <id>', 'Project id whose repositories to list.')
    .action(async function projectRepositoriesAction(this: Command, options: ProjectRepositoriesOptions) {
      const context = createCommandContext(this, dependencies);
      const projectId = options.id.trim();
      const aggregation = await context.api.listProjects();
      const project = (aggregation.projects ?? []).find(candidate => candidate.id === projectId);
      if (!project) {
        throw new CliHttpError(404, `Project ${projectId} was not found in the aggregation snapshot.`);
      }

      const payload = toProjectRepositoriesPayload(project);
      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatProjectRepositoriesHuman(payload));
    });
}

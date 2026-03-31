import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

export type ProjectDeleteOptions = {
  id: string;
  json?: boolean;
};

export function registerProjectDeleteCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('delete')
      .description('Delete a project by id.'),
  )
    .requiredOption('--id <id>', 'Project id to delete.')
    .action(async function projectDeleteAction(this: Command, options: ProjectDeleteOptions) {
      const context = createCommandContext(this, dependencies);
      const projectId = options.id.trim();
      await context.api.deleteProject(projectId);

      if (context.outputJson) {
        context.io.stdout(formatJson({ projectId, deleted: true }));
        return;
      }

      context.io.stdout(`Project deleted\nprojectId  ${projectId}\n`);
    });
}

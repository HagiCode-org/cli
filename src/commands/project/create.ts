import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatProjectSummaryHuman,
  toProjectView,
} from '../../formatters/project';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type ProjectCreateOptions = {
  name: string;
  path: string;
  description?: string;
  json?: boolean;
};

export function registerProjectCreateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('create')
      .description('Create a project through the generated project client.'),
  )
    .requiredOption('--name <name>', 'Project display name.')
    .requiredOption('--path <path>', 'Project root path.')
    .option('--description <text>', 'Optional project description.')
    .action(async function projectCreateAction(this: Command, options: ProjectCreateOptions) {
      const context = createCommandContext(this, dependencies);
      const project = await context.api.createProject({
        name: requireOptionValue(options.name, '--name'),
        path: requireOptionValue(options.path, '--path'),
        description: normalizeOptionalString(options.description),
      });

      const view = toProjectView(project);
      if (context.outputJson) {
        context.io.stdout(formatJson({ project: view }));
        return;
      }

      context.io.stdout(`Project created\n${formatProjectSummaryHuman(view)}`);
    });
}

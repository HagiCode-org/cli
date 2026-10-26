import type { Command } from 'commander';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { writeMonoSpecsDocument } from './shared';

export type ProjectMonoSpecsShowOptions = {
  id: string;
  yaml?: boolean;
  json?: boolean;
};

export function registerProjectMonoSpecsShowCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('show')
      .description('Show the MonoSpecs management document of a project, with local Git state per repository.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .option('--yaml', 'Also print the YAML preview in human-readable mode.')
    .action(async function projectMonoSpecsShowAction(this: Command, options: ProjectMonoSpecsShowOptions) {
      const context = createCommandContext(this, dependencies);
      const document = await context.api.getMonoSpecsManagement(requireOptionValue(options.id, '--id'));
      writeMonoSpecsDocument(context, document, { yaml: options.yaml === true });
    });
}

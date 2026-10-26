import type { Command } from 'commander';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { writeMonoSpecsDocument } from './shared';

export function registerProjectMonoSpecsInitCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('init')
      .description('Initialize the MonoSpecs configuration of a project. An initialized project returns its existing document.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .action(async function projectMonoSpecsInitAction(this: Command, options: { id: string }) {
      const context = createCommandContext(this, dependencies);
      const document = await context.api.initializeMonoSpecsManagement(requireOptionValue(options.id, '--id'));
      writeMonoSpecsDocument(context, document, { heading: 'MonoSpecs configuration initialized.' });
    });
}

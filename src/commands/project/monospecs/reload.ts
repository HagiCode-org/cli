import type { Command } from 'commander';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';
import { writeMonoSpecsDocument } from './shared';

export function registerProjectMonoSpecsReloadCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('reload')
      .description('Reread monospecs.yaml on the backend host and refresh the local Git state of its repositories.'),
  )
    .requiredOption('--id <id>', 'Project id.')
    .action(async function projectMonoSpecsReloadAction(this: Command, options: { id: string }) {
      const context = createCommandContext(this, dependencies);
      const document = await context.api.reloadMonoSpecsManagement(requireOptionValue(options.id, '--id'));
      writeMonoSpecsDocument(context, document, { heading: 'MonoSpecs configuration reloaded.' });
    });
}

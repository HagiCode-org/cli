import type { Command } from 'commander';
import { formatJson } from '../../../formatters/json';
import { formatVaultFilePreviewHuman, formatVaultFilePreviewPayload } from '../../../formatters/vault';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';

export type VaultFilesPreviewOptions = {
  id: string;
  path: string;
  json?: boolean;
};

export function registerVaultFilesPreviewCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('preview')
      .description('Preview supported file content from a registered vault.'),
  )
    .requiredOption('--id <id>', 'Vault id to browse.')
    .requiredOption('--path <path>', 'Relative file path to preview.')
    .action(async function vaultFilesPreviewAction(this: Command, options: VaultFilesPreviewOptions) {
      const context = createCommandContext(this, dependencies);
      const payload = formatVaultFilePreviewPayload(
        await context.api.previewVaultFile(
          requireOptionValue(options.id, '--id'),
          requireOptionValue(options.path, '--path'),
        ),
      );

      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatVaultFilePreviewHuman(payload));
    });
}

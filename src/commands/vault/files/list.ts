import type { Command } from 'commander';
import { formatJson } from '../../../formatters/json';
import { formatVaultFileListHuman, formatVaultFileListPayload } from '../../../formatters/vault';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../../runtime/commandContext';

export type VaultFilesListOptions = {
  id: string;
  path?: string;
  json?: boolean;
};

export function registerVaultFilesListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List files under a registered vault path.'),
  )
    .requiredOption('--id <id>', 'Vault id to browse.')
    .option('--path <path>', 'Optional relative path under the vault root.')
    .action(async function vaultFilesListAction(this: Command, options: VaultFilesListOptions) {
      const context = createCommandContext(this, dependencies);
      const payload = formatVaultFileListPayload(
        await context.api.listVaultFiles(
          requireOptionValue(options.id, '--id'),
          normalizeOptionalString(options.path),
        ),
      );

      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatVaultFileListHuman(payload));
    });
}

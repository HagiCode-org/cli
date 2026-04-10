import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatVaultDeleteHuman, formatVaultDeletePayload } from '../../formatters/vault';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type VaultDeleteOptions = {
  id: string;
  deleteLocalFiles?: boolean;
  json?: boolean;
};

export function registerVaultDeleteCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('delete')
      .description('Delete a vault by id and optionally request local file cleanup.'),
  )
    .requiredOption('--id <id>', 'Vault id to delete.')
    .option('--delete-local-files', 'Request backend deletion of local vault files.')
    .action(async function vaultDeleteAction(this: Command, options: VaultDeleteOptions) {
      const context = createCommandContext(this, dependencies);
      const payload = formatVaultDeletePayload(
        await context.api.deleteVault(requireOptionValue(options.id, '--id'), options.deleteLocalFiles === true),
      );

      if (context.outputJson) {
        context.io.stdout(formatJson(payload));
        return;
      }

      context.io.stdout(formatVaultDeleteHuman(payload));
    });
}

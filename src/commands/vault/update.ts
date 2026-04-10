import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatVaultListPayload, formatVaultSummaryHuman, toVaultView } from '../../formatters/vault';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliHttpError, CliUsageError } from '../../runtime/errors';

export type VaultUpdateOptions = {
  id: string;
  name?: string;
  type?: string;
  physicalPath?: string;
  gitUrl?: string;
  json?: boolean;
};

export function registerVaultUpdateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('update')
      .description('Update a vault by merging provided fields into the current vault snapshot.'),
  )
    .requiredOption('--id <id>', 'Vault id to update.')
    .option('--name <name>', 'Updated vault display name.')
    .option('--type <type>', 'Updated vault type.')
    .option('--physical-path <path>', 'Updated vault physical path.')
    .option('--git-url <url>', 'Updated git remote URL.')
    .action(async function vaultUpdateAction(this: Command, options: VaultUpdateOptions) {
      const nextName = normalizeOptionalString(options.name);
      const nextType = normalizeOptionalString(options.type);
      const nextPhysicalPath = normalizeOptionalString(options.physicalPath);
      const nextGitUrl = normalizeOptionalString(options.gitUrl);

      if (!nextName && !nextType && !nextPhysicalPath && !nextGitUrl) {
        throw new CliUsageError('Provide at least one field to update: --name, --type, --physical-path, or --git-url.');
      }

      const context = createCommandContext(this, dependencies);
      const vaultId = requireOptionValue(options.id, '--id');
      const current = formatVaultListPayload(await context.api.listVaults()).vaults.find(vault => vault.id === vaultId);
      if (!current) {
        throw new CliHttpError(404, `Vault ${vaultId} was not found in the latest vault snapshot.`);
      }

      const updated = await context.api.updateVault(vaultId, {
        name: nextName ?? current.name,
        type: nextType ?? current.type,
        physicalPath: nextPhysicalPath ?? current.physicalPath,
        gitUrl: nextGitUrl ?? current.gitUrl ?? null,
      });

      const view = toVaultView(updated);
      if (context.outputJson) {
        context.io.stdout(formatJson({ vault: view }));
        return;
      }

      context.io.stdout(`Vault updated\n${formatVaultSummaryHuman(view)}`);
    });
}

import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatVaultSummaryHuman, toVaultView } from '../../formatters/vault';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

export type VaultCreateOptions = {
  name: string;
  type: string;
  physicalPath: string;
  gitUrl?: string;
  json?: boolean;
};

export function registerVaultCreateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('create')
      .description('Create a vault through the generated vault client.'),
  )
    .requiredOption('--name <name>', 'Vault display name.')
    .requiredOption('--type <type>', 'Vault type, such as folder, obsidian, or coderef.')
    .requiredOption('--physical-path <path>', 'Vault physical path.')
    .option('--git-url <url>', 'Optional git remote URL for git-backed vaults.')
    .action(async function vaultCreateAction(this: Command, options: VaultCreateOptions) {
      const context = createCommandContext(this, dependencies);
      const vault = await context.api.createVault({
        name: requireOptionValue(options.name, '--name'),
        type: requireOptionValue(options.type, '--type'),
        physicalPath: requireOptionValue(options.physicalPath, '--physical-path'),
        gitUrl: normalizeOptionalString(options.gitUrl),
      });

      const view = toVaultView(vault);
      if (context.outputJson) {
        context.io.stdout(formatJson({ vault: view }));
        return;
      }

      context.io.stdout(`Vault created\n${formatVaultSummaryHuman(view)}`);
    });
}

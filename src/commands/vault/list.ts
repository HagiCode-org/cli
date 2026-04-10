import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatVaultListHuman, formatVaultListPayload } from '../../formatters/vault';
import { addJsonOption, createCommandContext, type AppDependencies } from '../../runtime/commandContext';

export function registerVaultListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List registered vaults through the generated vault client.'),
  ).action(async function vaultListAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const response = await context.api.listVaults();
    const payload = formatVaultListPayload(response);

    if (context.outputJson) {
      context.io.stdout(formatJson(payload));
      return;
    }

    context.io.stdout(formatVaultListHuman(payload.vaults));
  });
}

import type { Command } from 'commander';
import { registerVaultCreateCommand } from './vault/create';
import { registerVaultDeleteCommand } from './vault/delete';
import { registerVaultFilesListCommand } from './vault/files/list';
import { registerVaultFilesPreviewCommand } from './vault/files/preview';
import { registerVaultListCommand } from './vault/list';
import { registerVaultUpdateCommand } from './vault/update';
import type { AppDependencies } from '../runtime/commandContext';

export function registerVaultCommands(program: Command, dependencies: AppDependencies): void {
  const vault = program
    .command('vault')
    .description('Manage Hagi vaults and vault file browsing through generated backend APIs.');

  registerVaultListCommand(vault, dependencies);
  registerVaultCreateCommand(vault, dependencies);
  registerVaultUpdateCommand(vault, dependencies);
  registerVaultDeleteCommand(vault, dependencies);

  const files = vault
    .command('files')
    .description('Browse registered vault files and preview supported content.');

  registerVaultFilesListCommand(files, dependencies);
  registerVaultFilesPreviewCommand(files, dependencies);
}

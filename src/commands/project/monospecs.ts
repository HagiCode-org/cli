import type { Command } from 'commander';
import type { AppDependencies } from '../../runtime/commandContext';
import { registerProjectMonoSpecsCloneCommand } from './monospecs/clone';
import { registerProjectMonoSpecsInitCommand } from './monospecs/init';
import { registerProjectMonoSpecsReloadCommand } from './monospecs/reload';
import { registerProjectMonoSpecsRemoveCheckoutCommand } from './monospecs/remove-checkout';
import { registerProjectMonoSpecsSetCommand } from './monospecs/set';
import { registerProjectMonoSpecsShowCommand } from './monospecs/show';
import { registerProjectMonoSpecsValidateCommand } from './monospecs/validate';

export function registerProjectMonoSpecsCommand(parent: Command, dependencies: AppDependencies): void {
  const monospecs = parent
    .command('monospecs')
    .description('Manage the MonoSpecs configuration and the local repository checkouts of a project.');

  registerProjectMonoSpecsShowCommand(monospecs, dependencies);
  registerProjectMonoSpecsInitCommand(monospecs, dependencies);
  registerProjectMonoSpecsSetCommand(monospecs, dependencies);
  registerProjectMonoSpecsValidateCommand(monospecs, dependencies);
  registerProjectMonoSpecsReloadCommand(monospecs, dependencies);
  registerProjectMonoSpecsCloneCommand(monospecs, dependencies);
  registerProjectMonoSpecsRemoveCheckoutCommand(monospecs, dependencies);
}

import type { Command } from 'commander';
import { registerPlanCreateCommand } from './plan/create';
import { registerPlanDeleteCommand } from './plan/delete';
import { registerPlanDisableCommand } from './plan/disable';
import { registerPlanEnableCommand } from './plan/enable';
import { registerPlanGetCommand } from './plan/get';
import { registerPlanListCommand } from './plan/list';
import { registerPlanRunCommand } from './plan/run';
import { registerPlanUpdateCommand } from './plan/update';
import type { AppDependencies } from '../runtime/commandContext';

export function registerPlanCommands(program: Command, dependencies: AppDependencies): void {
  const plan = program
    .command('plan')
    .description('Manage scheduled plans: saved proposal or HagiTask inputs that run on a schedule.');

  registerPlanListCommand(plan, dependencies);
  registerPlanGetCommand(plan, dependencies);
  registerPlanCreateCommand(plan, dependencies);
  registerPlanUpdateCommand(plan, dependencies);
  registerPlanEnableCommand(plan, dependencies);
  registerPlanDisableCommand(plan, dependencies);
  registerPlanDeleteCommand(plan, dependencies);
  registerPlanRunCommand(plan, dependencies);
}

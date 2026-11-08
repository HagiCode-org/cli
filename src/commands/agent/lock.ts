import type { Command } from 'commander';
import { registerLockAcquireCommand } from './lock/acquire';
import { registerLockHeartbeatCommand } from './lock/heartbeat';
import { registerLockListCommand } from './lock/list';
import { registerLockReleaseCommand } from './lock/release';
import { registerLockRenewCommand } from './lock/renew';
import { registerLockRequisitionCommand } from './lock/requisition';
import { registerLockStatusCommand } from './lock/status';
import type { AppDependencies } from '../../runtime/commandContext';

export function registerAgentLockCommands(agent: Command, dependencies: AppDependencies): void {
  const lock = agent
    .command('lock')
    .description('Take turns on a shared resource with other agents: a fair queue lock with a heartbeat.');

  registerLockAcquireCommand(lock, dependencies);
  registerLockStatusCommand(lock, dependencies);
  registerLockRenewCommand(lock, dependencies);
  registerLockHeartbeatCommand(lock, dependencies);
  registerLockReleaseCommand(lock, dependencies);
  registerLockRequisitionCommand(lock, dependencies);
  registerLockListCommand(lock, dependencies);
}

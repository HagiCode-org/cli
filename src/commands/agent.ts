import type { Command } from 'commander';
import { registerAgentLockCommands } from './agent/lock';
import type { AppDependencies } from '../runtime/commandContext';

/** Registers the subgroup of one agent-facing capability under `hagi agent`. */
export type AgentCapabilityRegistrar = (agent: Command, dependencies: AppDependencies) => void;

/** One registrar per capability. A new capability is a new file plus one entry here. */
export const agentCapabilityRegistrars: AgentCapabilityRegistrar[] = [registerAgentLockCommands];

/** The `agent` group: a thin shell that only names the group and hands it to each capability's registrar. */
export function registerAgentCommands(
  program: Command,
  dependencies: AppDependencies,
  registrars: readonly AgentCapabilityRegistrar[] = agentCapabilityRegistrars,
): void {
  const agent = program
    .command('agent')
    .description('Manage agent-facing capabilities, such as the shared resource lock.');

  for (const register of registrars) {
    register(agent, dependencies);
  }
}

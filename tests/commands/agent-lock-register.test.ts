import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { registerAgentLockCommands } from '../../src/commands/agent/lock';
import { createDependencies } from './testHelpers';

function register() {
  const made = createDependencies();
  const agent = new Command('agent');
  registerAgentLockCommands(agent, made.dependencies);
  const lock = agent.commands.find(command => command.name() === 'lock');
  return { ...made, agent, lock };
}

describe('registerAgentLockCommands', () => {
  it('adds a single lock group under the agent command', () => {
    const { agent, lock } = register();

    expect(agent.commands.map(command => command.name())).toEqual(['lock']);
    expect(lock?.description()).toContain('fair queue lock');
  });

  it('registers every lock subcommand', () => {
    const { lock } = register();

    expect(lock?.commands.map(command => command.name()).sort()).toEqual([
      'acquire',
      'heartbeat',
      'list',
      'release',
      'renew',
      'requisition',
      'status',
    ]);
  });

  it('gives every subcommand a description for help output', () => {
    const { lock } = register();

    for (const command of lock?.commands ?? []) {
      expect(command.description(), command.name()).not.toBe('');
    }
  });

  it('makes no backend call while registering', () => {
    const { api } = register();

    for (const method of ['acquireLock', 'getLockStatus', 'renewLock', 'releaseLock', 'requisitionLock', 'listLocks'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });

  it('does not collide when registered on two separate agent commands', () => {
    const { dependencies } = createDependencies();
    const first = new Command('agent');
    const second = new Command('agent');

    registerAgentLockCommands(first, dependencies);
    registerAgentLockCommands(second, dependencies);

    expect(first.commands[0]).not.toBe(second.commands[0]);
    expect(second.commands[0].commands).toHaveLength(7);
  });
});

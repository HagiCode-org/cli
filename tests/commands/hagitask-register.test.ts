import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { registerHagiTaskCommands } from '../../src/commands/hagitask';
import { createDependencies } from './testHelpers';

function register() {
  const made = createDependencies();
  const program = new Command('hagi');
  registerHagiTaskCommands(program, made.dependencies);
  const group = program.commands.find(command => command.name() === 'hagitask');
  return { ...made, program, group };
}

describe('registerHagiTaskCommands (src/commands/hagitask.ts)', () => {
  it('adds a single hagitask group to the program', () => {
    const { program, group } = register();

    expect(program.commands.map(command => command.name())).toEqual(['hagitask']);
    expect(group).toBeDefined();
  });

  it('describes the group and the workflow it supports', () => {
    const { group } = register();

    expect(group?.description()).toContain('Manage HagiTask sessions');
    expect(group?.description()).toContain('--wait');
  });

  it('registers the seven subcommands in workflow order', () => {
    const { group } = register();

    expect(group?.commands.map(command => command.name())).toEqual(['list', 'schema', 'create', 'send', 'get', 'messages', 'answer']);
  });

  it('gives every subcommand a description', () => {
    const { group } = register();

    for (const command of group?.commands ?? []) {
      expect(command.description(), command.name()).not.toBe('');
    }
  });

  it('makes no backend call while registering', () => {
    const { api } = register();

    for (const method of ['listHagiTaskSchemas', 'getHagiTaskSchema', 'createHagiTaskSession', 'getSession', 'getSessionMessages', 'sendMessage'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });

  it('does not share command objects between two programs', () => {
    const { dependencies } = createDependencies();
    const first = new Command('hagi');
    const second = new Command('hagi');

    registerHagiTaskCommands(first, dependencies);
    registerHagiTaskCommands(second, dependencies);

    expect(first.commands[0]).not.toBe(second.commands[0]);
    expect(second.commands[0].commands).toHaveLength(7);
  });
});

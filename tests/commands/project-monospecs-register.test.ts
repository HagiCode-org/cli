import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { registerProjectMonoSpecsCommand } from '../../src/commands/project/monospecs';
import { createDependencies } from './testHelpers';

function register() {
  const made = createDependencies();
  const project = new Command('project');
  registerProjectMonoSpecsCommand(project, made.dependencies);
  const group = project.commands.find(command => command.name() === 'monospecs');
  return { ...made, project, group };
}

describe('registerProjectMonoSpecsCommand (src/commands/project/monospecs.ts)', () => {
  it('adds a single monospecs group under the project command', () => {
    const { project, group } = register();

    expect(project.commands.map(command => command.name())).toEqual(['monospecs']);
    expect(group?.description()).toBe('Manage the MonoSpecs configuration and the local repository checkouts of a project.');
  });

  it('registers the seven subcommands in order', () => {
    const { group } = register();

    expect(group?.commands.map(command => command.name())).toEqual([
      'show',
      'init',
      'set',
      'validate',
      'reload',
      'clone',
      'remove-checkout',
    ]);
  });

  it('gives every subcommand a description', () => {
    const { group } = register();

    for (const command of group?.commands ?? []) {
      expect(command.description(), command.name()).not.toBe('');
    }
  });

  it('makes no backend call while registering', () => {
    const { api } = register();

    for (const method of [
      'initializeMonoSpecsManagement',
      'reloadMonoSpecsManagement',
      'validateMonoSpecs',
      'cloneMonoSpecsRepositories',
      'removeMonoSpecsRepositoryCheckout',
    ] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });

  it('does not share command objects between two parents', () => {
    const { dependencies } = createDependencies();
    const first = new Command('project');
    const second = new Command('project');

    registerProjectMonoSpecsCommand(first, dependencies);
    registerProjectMonoSpecsCommand(second, dependencies);

    expect(first.commands[0]).not.toBe(second.commands[0]);
    expect(second.commands[0].commands).toHaveLength(7);
  });
});

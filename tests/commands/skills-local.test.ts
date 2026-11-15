import { Code, ConnectError } from '@connectrpc/connect';
import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerSkillsLocalCommands } from '../../src/commands/skills/local';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import {
  createBuiltInAvailabilityResult,
  createDependencies,
} from './testHelpers';

const skills = (...args: string[]) => ['node', 'hagi', 'skills', ...args];

function register(fn: (skills: Command, dependencies: never) => void) {
  const made = createDependencies();
  const parent = new Command('skills');
  fn(parent, made.dependencies as never);
  return { ...made, parent };
}

describe('group registration', () => {
  it('adds the local group with list, enable and disable', () => {
    const { parent } = register(registerSkillsLocalCommands);
    const group = parent.commands.find(command => command.name() === 'local');

    expect(group?.commands.map(command => command.name())).toEqual(['list', 'enable', 'disable']);
  });

  it('makes no backend call while registering the local group', () => {
    const { api } = register(registerSkillsLocalCommands);

    for (const method of ['listLocalSkills', 'setBuiltInSkillAvailability'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });
});

describe('hagi skills local', () => {
  it('prints the inventory unchanged as JSON', async () => {
    const { dependencies, stdout, api } = createDependencies();

    expect(await runCli(skills('local', 'list', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).items[0].name).toBe('demo-skill');
    expect(api.listLocalSkills).toHaveBeenCalledTimes(1);
  });

  it.each(['enable', 'disable'])('rejects a whitespace-only skill name for %s before any network call', async command => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(skills('local', command, '--skill-name', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--skill-name is required.');
    expect(api.setBuiltInSkillAvailability).not.toHaveBeenCalled();
  });

  it.each([
    ['enable', true],
    ['disable', false],
  ])('%s sends the trimmed slug with enabled %s', async (command, enabled) => {
    const { dependencies, api } = createDependencies({
      setBuiltInSkillAvailability: vi.fn().mockResolvedValue(createBuiltInAvailabilityResult('hagi', enabled)),
    });

    expect(await runCli(skills('local', command, '--skill-name', ' hagi '), dependencies)).toBe(0);
    expect(api.setBuiltInSkillAvailability).toHaveBeenCalledExactlyOnceWith({ slug: 'hagi', enabled });
  });

  it('prints the result as JSON and still exits 30 when the change did not apply', async () => {
    const { dependencies, stdout } = createDependencies({
      setBuiltInSkillAvailability: vi.fn().mockResolvedValue(createBuiltInAvailabilityResult('ghost', true, false)),
    });

    expect(await runCli(skills('local', 'enable', '--skill-name', 'ghost', '--json'), dependencies)).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(JSON.parse(stdout.join(''))).toMatchObject({ slug: 'ghost', succeeded: false });
  });

  it('uses the backend message when the change did not apply', async () => {
    const { dependencies, stderr } = createDependencies({
      setBuiltInSkillAvailability: vi.fn().mockResolvedValue(createBuiltInAvailabilityResult('ghost', true, false)),
    });

    await runCli(skills('local', 'enable', '--skill-name', 'ghost'), dependencies);

    expect(stderr.join('')).toContain('Unknown built-in skill: ghost.');
  });

  it('falls back to a generic message naming the slug when the backend gave none', async () => {
    const { dependencies, stderr } = createDependencies({
      setBuiltInSkillAvailability: vi.fn().mockResolvedValue({ slug: 'ghost', enabled: true, succeeded: false }),
    });

    await runCli(skills('local', 'disable', '--skill-name', 'ghost'), dependencies);

    expect(stderr.join('')).toContain('The built-in skill availability was not changed for ghost.');
  });

  it('fails without success text when the backend is unreachable', async () => {
    const { dependencies, stdout } = createDependencies({ listLocalSkills: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)) });

    expect(await runCli(skills('local', 'list'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

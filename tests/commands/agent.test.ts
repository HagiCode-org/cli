import type { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { agentCapabilityRegistrars, registerAgentCommands } from '../../src/commands/agent';
import { createCliApp, runCli } from '../../src/main';
import { createDependencies } from './testHelpers';

describe('hagi agent group', () => {
  it('lists the lock subgroup in `hagi agent --help`', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'agent', '--help'], dependencies)).toBe(0);
    expect(stdout.join('')).toMatch(/^\s+lock\b/m);
    expect(stdout.join('')).toContain('agent-facing capabilities');
  });

  it('lists the seven lock verbs in `hagi agent lock --help`', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'agent', 'lock', '--help'], dependencies)).toBe(0);
    for (const verb of ['acquire', 'status', 'renew', 'heartbeat', 'release', 'requisition', 'list']) {
      expect(stdout.join('')).toMatch(new RegExp(`^\\s+${verb}\\b`, 'm'));
    }
  });

  it('shows a second capability registrar without any change to the group', async () => {
    const { dependencies, stdout } = createDependencies();
    const program = createCliApp(dependencies);
    const fresh = new (program.constructor as new () => Command)();
    fresh.exitOverride();
    fresh.configureOutput({ writeOut: value => stdout.push(value), writeErr: () => undefined });

    registerAgentCommands(fresh, dependencies, [
      ...agentCapabilityRegistrars,
      (agent, deps) => {
        agent.command('other').description('A second agent capability.').action(() => {
          deps.io.stdout('other ran\n');
        });
      },
    ]);

    await expect(fresh.parseAsync(['node', 'hagi', 'agent', '--help'])).rejects.toMatchObject({ code: 'commander.helpDisplayed' });
    const help = stdout.join('');
    expect(help).toMatch(/^\s+lock\b/m);
    expect(help).toMatch(/^\s+other\b/m);

    await fresh.parseAsync(['node', 'hagi', 'agent', 'other']);
    expect(stdout.join('')).toContain('other ran');
  });

  it('adds only `agent` to the top-level commands', () => {
    const { dependencies } = createDependencies();
    const names = createCliApp(dependencies).commands.map(command => command.name());

    expect(names).toEqual(['project', 'proposal', 'vault', 'chat', 'hagitask', 'plan', 'skills', 'agent']);
    expect(names).not.toContain('lock');
  });

  it('mentions agent-facing capabilities in the program description', () => {
    const { dependencies } = createDependencies();

    expect(createCliApp(dependencies).description()).toContain('agent-facing capabilities');
  });
});

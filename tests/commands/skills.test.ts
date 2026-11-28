import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createLocalSkillInventory, createSelfEvolutionInventoryItem } from './testHelpers';

let tempDir: string;
let restoreStdin: (() => void) | undefined;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'hagi-cli-skills-'));
});

afterEach(async () => {
  restoreStdin?.();
  restoreStdin = undefined;
  await rm(tempDir, { recursive: true, force: true });
});

/** Replaces process.stdin with the given content so `--input -` can be exercised. */
function withStdin(content: string): void {
  const original = Object.getOwnPropertyDescriptor(process, 'stdin');
  Object.defineProperty(process, 'stdin', { value: Readable.from([content]), configurable: true });
  restoreStdin = () => {
    if (original) {
      Object.defineProperty(process, 'stdin', original);
    }
  };
}

describe('skills local commands', () => {
  it('lists installed local skills in human-readable form', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'list'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.listLocalSkills).toHaveBeenCalledOnce();
    const output = stdout.join('');
    expect(output).toContain('Local skills (2)');
    expect(output).toContain('Origin');
    expect(output).toContain('Enabled');
    expect(output).toContain('Version');
    expect(output).toContain('demo-skill');
    expect(output).toContain('global');
    expect(output).toContain('claude-code, codex');
    expect(output).toContain('/home/user/.agents/skills/demo-skill');

    const rows = output.split('\n');
    const cellsFor = (name: string) => rows.find(line => line.startsWith(`${name} `))?.split(/\s{2,}/);
    expect(cellsFor('demo-skill')).toEqual(['demo-skill', 'user', '-', '1.2.0', 'global', 'claude-code, codex', '/home/user/.agents/skills/demo-skill']);
    expect(cellsFor('hagi')).toEqual(['hagi', 'built-in', 'yes', '1.4.0', 'global', '-', '/home/user/.hagi/skills/hagi']);
  });

  it('keeps managed install metadata, origin and built-in state in JSON output', async () => {
    const { dependencies, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'list', '--json'], dependencies);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join(''));
    expect(payload.generatedAtUtc).toBe('2026-10-16T00:00:00Z');
    expect(payload.items[0].managedInstallMetadata).toMatchObject({
      skillId: 'demo-skill',
      version: '1.2.0',
      installReference: 'vercel/skills@demo-skill',
    });
    expect(payload.items[0].origin).toBe('user');
    expect(payload.items[1]).toMatchObject({
      origin: 'built-in',
      builtIn: { enabled: true, version: '1.4.0', source: 'built-in', repository: 'hagicode' },
    });
  });

  it('lists a Self Evolution row with its status, enabled state and version, and keeps every field in JSON', async () => {
    const row = createSelfEvolutionInventoryItem({ name: 'evolved-skill', enabled: false, status: 'conflict', version: null });
    const base = createLocalSkillInventory();
    const { dependencies, stdout } = createDependencies({
      listLocalSkills: vi.fn().mockResolvedValue({ ...base, items: [...base.items, row] }),
    });

    expect(await runCli(['node', 'hagi', 'skills', 'local', 'list'], dependencies)).toBe(0);
    const rows = stdout.join('').split('\n');
    const cellsFor = (name: string) => rows.find(line => line.startsWith(`${name} `))?.split(/\s{2,}/);
    expect(cellsFor('evolved-skill')).toEqual([
      'evolved-skill',
      'self-evolution',
      'no',
      '-',
      'conflict',
      'self-evolution',
      '-',
      '/home/user/vault/self-evolution-skills/evolved-skill',
    ]);

    const json = createDependencies({
      listLocalSkills: vi.fn().mockResolvedValue({ ...base, items: [...base.items, row] }),
    });
    expect(await runCli(['node', 'hagi', 'skills', 'local', 'list', '--json'], json.dependencies)).toBe(0);
    expect(JSON.parse(json.stdout.join('')).items[2]).toMatchObject({
      name: 'evolved-skill',
      origin: 'self-evolution',
      selfEvolution: { enabled: false, status: 'conflict', version: null },
    });
  });

  it('documents enable and disable in help, including when the change takes effect', async () => {
    for (const action of ['enable', 'disable']) {
      const { dependencies, stdout } = createDependencies();
      const exitCode = await runCli(['node', 'hagi', 'skills', 'local', action, '--help'], dependencies);

      expect(exitCode).toBe(0);
      const help = stdout.join('');
      expect(help).toContain('--skill-name <name>');
      expect(help).toContain('agent runs that start afterwards');
    }
  });

  it('lists list, enable and disable under skills local', async () => {
    const { dependencies, stdout } = createDependencies();
    await runCli(['node', 'hagi', 'skills', 'local', '--help'], dependencies);

    const help = stdout.join('');
    for (const command of ['list', 'enable', 'disable']) {
      expect(help).toMatch(new RegExp(`^\\s+${command}\\b`, 'm'));
    }
  });

  it('enables a built-in skill and shows the resulting state in human output', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'enable', '--skill-name', 'hagi'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.setBuiltInSkillAvailability).toHaveBeenCalledWith({ slug: 'hagi', enabled: true });
    const output = stdout.join('');
    expect(output).toMatch(/^skillName\s+hagi$/m);
    expect(output).toMatch(/^enabled\s+yes$/m);
  });

  it('disables a built-in skill and sends enabled false', async () => {
    const { dependencies, api, stdout } = createDependencies({
      setBuiltInSkillAvailability: vi.fn().mockResolvedValue({
        slug: 'hagi',
        enabled: false,
        succeeded: true,
        userMessage: 'Built-in skill hagi is now disabled.',
        diagnosticMessage: null,
      }),
    });
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'disable', '--skill-name', 'hagi'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.setBuiltInSkillAvailability).toHaveBeenCalledWith({ slug: 'hagi', enabled: false });
    expect(stdout.join('')).toMatch(/^enabled\s+no$/m);
  });

  it('emits the backend result fields in JSON output', async () => {
    const { dependencies, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'skills', 'local', 'disable', '--skill-name', 'hagi', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join(''));
    expect(Object.keys(payload).sort()).toEqual(['diagnosticMessage', 'enabled', 'slug', 'succeeded', 'userMessage']);
    expect(payload).toMatchObject({ slug: 'hagi', succeeded: true });
  });

  it('fails locally with a usage code when --skill-name is missing, without calling the API', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'enable'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.setBuiltInSkillAvailability).not.toHaveBeenCalled();
  });

  it('prints the backend message for an unknown name and exits with the operation-failed code', async () => {
    const { dependencies, stdout, stderr } = createDependencies({
      setBuiltInSkillAvailability: vi.fn().mockResolvedValue({
        slug: 'nope',
        enabled: false,
        succeeded: false,
        userMessage: 'Unknown built-in skill: nope.',
        diagnosticMessage: 'No built-in skill matches the slug.',
      }),
    });
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'enable', '--skill-name', 'nope'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(exitCode).toBe(30);
    expect(stdout.join('')).toMatch(/^enabled\s+no$/m);
    expect(stderr.join('')).toContain('Unknown built-in skill: nope.');
  });
});

describe('skills recommend command', () => {
  it('rejects skills recommend as an unknown command and does not list it in skills help', async () => {
    const { dependencies } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'recommend'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);

    const help = createDependencies();
    await runCli(['node', 'hagi', 'skills', '--help'], help.dependencies);
    expect(help.stdout.join('')).not.toMatch(/^\s+recommend\b/m);
  });
});

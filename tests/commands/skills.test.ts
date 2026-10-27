import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from './testHelpers';

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

  it('uninstalls one local skill and prints the returned status', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'skills', 'local', 'uninstall', '--skill-name', 'demo-skill'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.uninstallLocalSkill).toHaveBeenCalledWith({ skillName: 'demo-skill' });
    const output = stdout.join('');
    expect(output).toContain('Succeeded');
    expect(output).toContain('Skill uninstalled.');
  });

  it('says in uninstall help that built-in skills cannot be uninstalled and points to disable', async () => {
    const { dependencies, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'local', 'uninstall', '--help'], dependencies);

    expect(exitCode).toBe(0);
    // Help wraps at 100 columns, so the command name can break across lines.
    const help = stdout.join('').replace(/\s+/g, ' ');
    expect(help).toContain('Built-in skills cannot be uninstalled');
    expect(help).toContain('skills local disable --skill-name <name>');
  });

  it('prints a backend refusal for a built-in uninstall unchanged and does not claim removal', async () => {
    const refusal = {
      skillName: 'hagi',
      status: 'PrerequisiteMissing',
      userMessage: 'Built-in skills cannot be uninstalled. Disable the skill instead.',
      diagnosticMessage: null,
      occurredAt: '2026-10-16T00:00:00Z',
    };
    const { dependencies, api, stdout } = createDependencies({
      uninstallLocalSkill: vi.fn().mockResolvedValue(refusal),
    });
    const exitCode = await runCli(
      ['node', 'hagi', 'skills', 'local', 'uninstall', '--skill-name', 'hagi'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.uninstallLocalSkill).toHaveBeenCalledWith({ skillName: 'hagi' });
    const output = stdout.join('');
    expect(output).toMatch(/^status\s+PrerequisiteMissing$/m);
    expect(output).toContain('Built-in skills cannot be uninstalled. Disable the skill instead.');
    expect(output).not.toContain('Succeeded');
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

  it('lists list, enable, disable and uninstall under skills local', async () => {
    const { dependencies, stdout } = createDependencies();
    await runCli(['node', 'hagi', 'skills', 'local', '--help'], dependencies);

    const help = stdout.join('');
    for (const command of ['list', 'enable', 'disable', 'uninstall']) {
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

describe('skills gallery commands', () => {
  it('searches the gallery with the keyword and renders id, source, installs, and trust', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'gallery', 'search', '--query', 'react'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.searchSkillGallery).toHaveBeenCalledWith('react');
    const output = stdout.join('');
    expect(output).toContain('Gallery skills (2)');
    expect(output).toContain('react-best-practices');
    expect(output).toContain('vercel/skills');
    expect(output).toContain('1280');
  });

  it('omits the query when searching without a keyword', async () => {
    const { dependencies, api } = createDependencies();
    await runCli(['node', 'hagi', 'skills', 'gallery', 'search'], dependencies);

    expect(api.searchSkillGallery).toHaveBeenCalledWith(undefined);
  });

  it('loads gallery detail with installability, trust summary, repository, and install preview', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'skills', 'gallery', 'detail', '--id', 'react-best-practices', '--source', 'vercel/skills'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.getSkillGalleryDetail).toHaveBeenCalledWith('react-best-practices', 'vercel/skills');
    const output = stdout.join('');
    expect(output).toContain('installable');
    expect(output).toContain('Vercel');
    expect(output).toContain('https://github.com/vercel/skills');
    expect(output).toContain('npx skills add vercel/skills --skill react-best-practices');
  });

  it('starts a managed install and preserves the version token in the request and output', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      [
        'node', 'hagi', 'skills', 'gallery', 'install',
        '--id', 'react-best-practices',
        '--source', 'vercel/skills',
        '--skill-slug', 'react-best-practices',
        '--version', '1.2.0',
        '--json',
      ],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.installGallerySkill).toHaveBeenCalledWith({
      id: 'react-best-practices',
      source: 'vercel/skills',
      skillSlug: 'react-best-practices',
      version: '1.2.0',
    });
    const payload = JSON.parse(stdout.join(''));
    expect(payload.installReference).toBe('vercel/skills@react-best-practices');
    expect(payload.version).toBe('1.2.0');
    expect(payload.status).toBe('Succeeded');
  });

  it('prints the normalized install reference, status, and diagnostic in human output', async () => {
    const { dependencies, stdout } = createDependencies();
    await runCli(
      ['node', 'hagi', 'skills', 'gallery', 'install', '--id', 'x', '--source', 'vercel/skills', '--skill-slug', 'x'],
      dependencies,
    );

    const output = stdout.join('');
    expect(output).toContain('installReference');
    expect(output).toContain('vercel/skills@react-best-practices');
    expect(output).toContain('Succeeded');
  });
});

describe('skills recommendation and install stream', () => {
  it('rejects skills recommend as an unknown command and does not list it in skills help', async () => {
    const { dependencies } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'recommend'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);

    const help = createDependencies();
    await runCli(['node', 'hagi', 'skills', '--help'], help.dependencies);
    expect(help.stdout.join('')).not.toMatch(/^\s+recommend\b/m);
  });

  it('installs a gallery skill with the single install request and no stream method on the facade', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli(
      [
        'node', 'hagi', 'skills', 'gallery', 'install',
        '--id', 'react-best-practices',
        '--source', 'vercel/skills',
        '--skill-slug', 'react-best-practices',
      ],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.installGallerySkill).toHaveBeenCalledTimes(1);
    const facadeMethods = Object.keys(createGrpcHagiApi());
    expect(facadeMethods.filter(name => /stream|recommend/i.test(name))).toEqual([]);
    expect(facadeMethods).toContain('installGallerySkill');
  });
});

describe('skills trusted commands', () => {
  it('lists trusted providers with id, name, enabled, preset, and rule count', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'trusted', 'list'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.listTrustedSkillProviders).toHaveBeenCalledOnce();
    const output = stdout.join('');
    expect(output).toContain('Provider ID');
    expect(output).toContain('vercel');
    expect(output).toContain('Vercel');
    expect(output).toContain('directory version 3');
  });

  it('upserts a provider from a JSON file and prints the updated snapshot', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const inputPath = join(tempDir, 'provider.json');
    await writeFile(inputPath, JSON.stringify({
      providerId: 'acme',
      displayName: 'Acme',
      isEnabled: true,
      sortOrder: 2,
      matchRules: [{ matchType: 'owner', value: 'acme' }],
    }));

    const exitCode = await runCli(
      ['node', 'hagi', 'skills', 'trusted', 'upsert', '--input', inputPath, '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.upsertTrustedSkillProvider).toHaveBeenCalledWith({
      providerId: 'acme',
      displayName: 'Acme',
      isEnabled: true,
      sortOrder: 2,
      matchRules: [{ matchType: 'owner', value: 'acme' }],
    });
    expect(JSON.parse(stdout.join('')).version).toBe(3);
  });

  it('sends the same upsert request whether the body comes from a file or stdin', async () => {
    const body = { providerId: 'acme', displayName: 'Acme', isEnabled: true, sortOrder: 2, matchRules: [] };
    const inputPath = join(tempDir, 'provider.json');
    await writeFile(inputPath, JSON.stringify(body));

    const fromFile = createDependencies();
    await runCli(['node', 'hagi', 'skills', 'trusted', 'upsert', '--input', inputPath], fromFile.dependencies);

    withStdin(JSON.stringify(body));
    const fromStdin = createDependencies();
    await runCli(['node', 'hagi', 'skills', 'trusted', 'upsert', '--input', '-'], fromStdin.dependencies);

    expect(fromStdin.api.upsertTrustedSkillProvider).toHaveBeenCalledWith(
      (fromFile.api.upsertTrustedSkillProvider as ReturnType<typeof vi.fn>).mock.calls[0][0],
    );
  });

  it('rejects a non-object upsert document before sending any request', async () => {
    const { dependencies, api, stderr } = createDependencies();
    const inputPath = join(tempDir, 'provider.json');
    await writeFile(inputPath, JSON.stringify(['not', 'an', 'object']));

    const exitCode = await runCli(['node', 'hagi', 'skills', 'trusted', 'upsert', '--input', inputPath], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.upsertTrustedSkillProvider).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('must be a JSON object');
  });

  it('deletes one provider by id and prints the refreshed snapshot', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'skills', 'trusted', 'delete', '--provider-id', 'vercel'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.deleteTrustedSkillProvider).toHaveBeenCalledWith({ providerId: 'vercel' });
    expect(stdout.join('')).toContain('Trusted providers');
  });

  it('resets trusted providers to the backend defaults', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(['node', 'hagi', 'skills', 'trusted', 'reset', '--json'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.resetTrustedSkillProviders).toHaveBeenCalledOnce();
    expect(JSON.parse(stdout.join('')).items[0].providerId).toBe('vercel');
  });
});

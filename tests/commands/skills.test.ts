import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
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
    expect(output).toContain('Local skills (1)');
    expect(output).toContain('demo-skill');
    expect(output).toContain('global');
    expect(output).toContain('claude-code, codex');
    expect(output).toContain('/home/user/.agents/skills/demo-skill');
  });

  it('keeps managed install metadata in JSON output', async () => {
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

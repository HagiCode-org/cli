import { Code, ConnectError } from '@connectrpc/connect';
import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerSkillsGalleryCommands } from '../../src/commands/skills/gallery';
import { registerSkillsLocalCommands } from '../../src/commands/skills/local';
import { registerSkillsTrustedCommands } from '../../src/commands/skills/trusted';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import {
  createApiError,
  createBuiltInAvailabilityResult,
  createDependencies,
  createSkillGallery,
  createSkillGalleryDetail,
  createTrustedProviderList,
  createUninstallResult,
} from './testHelpers';

const skills = (...args: string[]) => ['node', 'hagi', 'skills', ...args];

function register(fn: (skills: Command, dependencies: never) => void) {
  const made = createDependencies();
  const parent = new Command('skills');
  fn(parent, made.dependencies as never);
  return { ...made, parent };
}

describe('group registration', () => {
  it('adds the gallery group with search, detail and install', () => {
    const { parent } = register(registerSkillsGalleryCommands);
    const group = parent.commands.find(command => command.name() === 'gallery');

    expect(group?.description()).toBe('Search the skill gallery, read skill details, and start managed installs.');
    expect(group?.commands.map(command => command.name())).toEqual(['search', 'detail', 'install']);
  });

  it('adds the local group with list, enable, disable and uninstall', () => {
    const { parent } = register(registerSkillsLocalCommands);
    const group = parent.commands.find(command => command.name() === 'local');

    expect(group?.commands.map(command => command.name())).toEqual(['list', 'enable', 'disable', 'uninstall']);
  });

  it('adds the trusted group with list, upsert, delete and reset', () => {
    const { parent } = register(registerSkillsTrustedCommands);
    const group = parent.commands.find(command => command.name() === 'trusted');

    expect(group?.description()).toBe('Manage the trusted skill provider directory.');
    expect(group?.commands.map(command => command.name())).toEqual(['list', 'upsert', 'delete', 'reset']);
  });

  it.each([
    ['gallery', registerSkillsGalleryCommands],
    ['local', registerSkillsLocalCommands],
    ['trusted', registerSkillsTrustedCommands],
  ] as const)('makes no backend call while registering the %s group', (_name, fn) => {
    const { api } = register(fn);

    for (const method of ['searchSkillGallery', 'listLocalSkills', 'uninstallLocalSkill', 'setBuiltInSkillAvailability', 'listTrustedSkillProviders', 'resetTrustedSkillProviders'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });
});

describe('hagi skills gallery', () => {
  it.each([[''], ['   ']])('treats the query %j as no query', async query => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('gallery', 'search', '--query', query), dependencies)).toBe(0);
    expect(api.searchSkillGallery).toHaveBeenCalledWith(undefined);
  });

  it('trims the search query', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('gallery', 'search', '--query', '  review  '), dependencies)).toBe(0);
    expect(api.searchSkillGallery).toHaveBeenCalledExactlyOnceWith('review');
  });

  it('prints the search response unchanged as JSON', async () => {
    const gallery = createSkillGallery();
    const { dependencies, stdout } = createDependencies({ searchSkillGallery: vi.fn().mockResolvedValue(gallery) });

    expect(await runCli(skills('gallery', 'search', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(JSON.parse(JSON.stringify(gallery)));
  });

  it('asks for the detail and the audit of the trimmed id and source together', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('gallery', 'detail', '--id', '  demo ', '--source', ' vercel/skills  '), dependencies)).toBe(0);
    expect(api.getSkillGalleryDetail).toHaveBeenCalledExactlyOnceWith('demo', 'vercel/skills');
    expect(api.getSkillGalleryAudit).toHaveBeenCalledExactlyOnceWith('demo', 'vercel/skills');
  });

  it.each([
    ['--id', ['--source', 's']],
    ['--source', ['--id', 'i']],
  ])('fails detail without %s and calls nothing', async (_missing, rest) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('gallery', 'detail', ...rest), dependencies)).not.toBe(0);
    expect(api.getSkillGalleryDetail).not.toHaveBeenCalled();
  });

  it.each([
    ['--id', ['--id', '  ', '--source', 's']],
    ['--source', ['--id', 'i', '--source', '  ']],
  ])('rejects a whitespace-only %s for detail before any network call', async (flag, args) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(skills('gallery', 'detail', ...args), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(`${flag} is required.`);
    expect(api.getSkillGalleryDetail).not.toHaveBeenCalled();
  });

  it('treats an audit answer without a provider list as an empty audit', async () => {
    const { dependencies, stdout } = createDependencies({ getSkillGalleryAudit: vi.fn().mockResolvedValue({}) });

    expect(await runCli(skills('gallery', 'detail', '--id', 'i', '--source', 's', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).audit).toEqual({ providers: [] });
  });

  it('keeps the detail fields next to the audit in JSON', async () => {
    const detail = createSkillGalleryDetail();
    const { dependencies, stdout } = createDependencies({ getSkillGalleryDetail: vi.fn().mockResolvedValue(detail) });

    expect(await runCli(skills('gallery', 'detail', '--id', 'i', '--source', 's', '--json'), dependencies)).toBe(0);
    expect(Object.keys(JSON.parse(stdout.join('')))).toEqual(expect.arrayContaining([...Object.keys(JSON.parse(JSON.stringify(detail))), 'audit']));
  });

  it('maps a missing gallery skill to the not-found exit code', async () => {
    const { dependencies } = createDependencies({
      getSkillGalleryDetail: vi.fn().mockRejectedValue(createApiError(404, { error: 'No such skill.' })),
    });

    expect(await runCli(skills('gallery', 'detail', '--id', 'i', '--source', 's'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });

  it('sends the install request with trimmed fields and no version when none is given', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('gallery', 'install', '--id', ' i ', '--source', ' s ', '--skill-slug', ' slug '), dependencies)).toBe(0);
    expect(api.installGallerySkill).toHaveBeenCalledExactlyOnceWith({ id: 'i', source: 's', skillSlug: 'slug', version: undefined });
  });

  it('trims the version and drops a blank one', async () => {
    const withVersion = createDependencies();
    const blank = createDependencies();

    await runCli(skills('gallery', 'install', '--id', 'i', '--source', 's', '--skill-slug', 'x', '--version', ' 1.2.3 '), withVersion.dependencies);
    await runCli(skills('gallery', 'install', '--id', 'i', '--source', 's', '--skill-slug', 'x', '--version', '  '), blank.dependencies);

    expect(withVersion.api.installGallerySkill).toHaveBeenCalledWith(expect.objectContaining({ version: '1.2.3' }));
    expect(blank.api.installGallerySkill).toHaveBeenCalledWith(expect.objectContaining({ version: undefined }));
  });

  it.each(['--id', '--source', '--skill-slug'])('rejects a whitespace-only %s for install before any network call', async flag => {
    const { dependencies, api } = createDependencies();
    const args = { '--id': 'i', '--source': 's', '--skill-slug': 'x', [flag]: '  ' };

    expect(
      await runCli(skills('gallery', 'install', ...Object.entries(args).flatMap(([key, value]) => [key, value])), dependencies),
    ).toBe(EXIT_CODES.USAGE);
    expect(api.installGallerySkill).not.toHaveBeenCalled();
  });

  it('fails without a required install option', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('gallery', 'install', '--id', 'i', '--source', 's'), dependencies)).not.toBe(0);
    expect(api.installGallerySkill).not.toHaveBeenCalled();
  });

  it('prints the install result as JSON', async () => {
    const result = { reference: 'ref-1', status: 'Queued' };
    const { dependencies, stdout } = createDependencies({ installGallerySkill: vi.fn().mockResolvedValue(result) });

    expect(await runCli(skills('gallery', 'install', '--id', 'i', '--source', 's', '--skill-slug', 'x', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(result);
  });
});

describe('hagi skills local', () => {
  it('prints the inventory unchanged as JSON', async () => {
    const { dependencies, stdout, api } = createDependencies();

    expect(await runCli(skills('local', 'list', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).items[0].name).toBe('demo-skill');
    expect(api.listLocalSkills).toHaveBeenCalledTimes(1);
  });

  it('uninstalls the trimmed skill name', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('local', 'uninstall', '--skill-name', '  demo-skill '), dependencies)).toBe(0);
    expect(api.uninstallLocalSkill).toHaveBeenCalledExactlyOnceWith({ skillName: 'demo-skill' });
  });

  it('prints the uninstall result as JSON', async () => {
    const { dependencies, stdout } = createDependencies({ uninstallLocalSkill: vi.fn().mockResolvedValue(createUninstallResult('demo-skill')) });

    expect(await runCli(skills('local', 'uninstall', '--skill-name', 'demo-skill', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({ skillName: 'demo-skill', status: 'Succeeded' });
  });

  it.each(['uninstall', 'enable', 'disable'])('rejects a whitespace-only skill name for %s before any network call', async command => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(skills('local', command, '--skill-name', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--skill-name is required.');
    expect(api.uninstallLocalSkill).not.toHaveBeenCalled();
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

describe('hagi skills trusted', () => {
  it('prints the provider list unchanged as JSON', async () => {
    const list = createTrustedProviderList();
    const { dependencies, stdout } = createDependencies({ listTrustedSkillProviders: vi.fn().mockResolvedValue(list) });

    expect(await runCli(skills('trusted', 'list', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual(JSON.parse(JSON.stringify(list)));
  });

  it('deletes by the trimmed provider id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('trusted', 'delete', '--provider-id', '  vercel '), dependencies)).toBe(0);
    expect(api.deleteTrustedSkillProvider).toHaveBeenCalledExactlyOnceWith({ providerId: 'vercel' });
  });

  it('rejects a whitespace-only provider id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(skills('trusted', 'delete', '--provider-id', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--provider-id is required.');
    expect(api.deleteTrustedSkillProvider).not.toHaveBeenCalled();
  });

  it('fails delete without --provider-id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('trusted', 'delete'), dependencies)).not.toBe(0);
    expect(api.deleteTrustedSkillProvider).not.toHaveBeenCalled();
  });

  it('fails upsert without --input and sends nothing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('trusted', 'upsert'), dependencies)).not.toBe(0);
    expect(api.upsertTrustedSkillProvider).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only upsert input before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(skills('trusted', 'upsert', '--input', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.upsertTrustedSkillProvider).not.toHaveBeenCalled();
  });

  it('prints the refreshed snapshot as JSON for reset', async () => {
    const list = createTrustedProviderList();
    const { dependencies, stdout, api } = createDependencies({ resetTrustedSkillProviders: vi.fn().mockResolvedValue(list) });

    expect(await runCli(skills('trusted', 'reset', '--json'), dependencies)).toBe(0);
    expect(api.resetTrustedSkillProviders).toHaveBeenCalledTimes(1);
    expect(JSON.parse(stdout.join('')).version).toBe(3);
  });

  it('maps a rejected delete to its exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      deleteTrustedSkillProvider: vi.fn().mockRejectedValue(createApiError(404, { error: 'Provider not found.' })),
    });

    expect(await runCli(skills('trusted', 'delete', '--provider-id', 'ghost'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
  });
});

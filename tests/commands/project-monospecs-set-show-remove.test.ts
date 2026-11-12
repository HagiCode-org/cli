import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerProjectMonoSpecsRemoveCheckoutCommand } from '../../src/commands/project/monospecs/remove-checkout';
import { registerProjectMonoSpecsSetCommand } from '../../src/commands/project/monospecs/set';
import { registerProjectMonoSpecsShowCommand } from '../../src/commands/project/monospecs/show';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createMonoSpecsDocument } from './testHelpers';

const monospecs = (...args: string[]) => ['node', 'hagi', 'project', 'monospecs', ...args];

describe('registration functions', () => {
  it('are exported for the monospecs group', () => {
    expect(typeof registerProjectMonoSpecsSetCommand).toBe('function');
    expect(typeof registerProjectMonoSpecsShowCommand).toBe('function');
    expect(typeof registerProjectMonoSpecsRemoveCheckoutCommand).toBe('function');
  });
});

describe('hagi project monospecs show (registerProjectMonoSpecsShowCommand)', () => {
  it('reads the trimmed project id once', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('show', '--id', ' project-1 '), dependencies)).toBe(0);
    expect(api.getMonoSpecsManagement).toHaveBeenCalledExactlyOnceWith('project-1');
  });

  it('prints no heading in human mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(monospecs('show', '--id', 'p'), dependencies)).toBe(0);
    expect(stdout.join('')).not.toMatch(/^MonoSpecs configuration (initialized|reloaded|saved)/);
  });

  it('does not print the YAML preview unless asked, and prints it with --yaml', async () => {
    const withYaml = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ yamlPreview: 'unique-yaml-marker: 1\n' })),
    });
    expect(await runCli(monospecs('show', '--id', 'p'), withYaml.dependencies)).toBe(0);
    expect(withYaml.stdout.join('')).not.toContain('unique-yaml-marker');

    const asked = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ yamlPreview: 'unique-yaml-marker: 1\n' })),
    });
    expect(await runCli(monospecs('show', '--id', 'p', '--yaml'), asked.dependencies)).toBe(0);
    expect(asked.stdout.join('')).toContain('unique-yaml-marker');
  });

  it('ignores --yaml in JSON mode and prints the payload', async () => {
    const { dependencies, stdout } = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ version: '4.2' })),
    });

    expect(await runCli(monospecs('show', '--id', 'p', '--yaml', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).version).toBe('4.2');
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('show', '--id', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
  });
});

describe('hagi project monospecs remove-checkout (registerProjectMonoSpecsRemoveCheckoutCommand)', () => {
  const remove = (...args: string[]) => monospecs('remove-checkout', '--id', 'p', ...args);

  it('normalises the path and sends force false by default', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(remove('--path', ' .\\repos\\web\\ '), dependencies)).toBe(0);
    expect(api.removeMonoSpecsRepositoryCheckout).toHaveBeenCalledExactlyOnceWith('p', 'repos/web', false);
  });

  it.each(['', '   ', '.', '/'])('rejects the path %j before any network call', async given => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(remove('--path', given), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.removeMonoSpecsRepositoryCheckout).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only project id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('remove-checkout', '--id', ' ', '--path', 'repos/web'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.removeMonoSpecsRepositoryCheckout).not.toHaveBeenCalled();
  });

  it('prints the removed path and message as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockResolvedValue({ path: 'repos/web', removed: true, message: 'Gone.' }),
    });

    expect(await runCli(remove('--path', 'repos/web', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({ path: 'repos/web', removed: true });
  });

  it('suggests --force for a conflict that mentions force, in any letter case', async () => {
    const { dependencies, stderr } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(createApiError(409, { error: 'Checkout has changes; use FORCE to delete.' })),
    });

    expect(await runCli(remove('--path', 'repos/web'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stderr.join('')).toContain('Re-run with --force to delete this checkout anyway.');
  });

  it('does not suggest --force when it was already given', async () => {
    const { dependencies, stderr } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(createApiError(409, { error: 'Cannot delete even with force.' })),
    });

    expect(await runCli(remove('--path', 'repos/web', '--force'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stderr.join('')).not.toContain('Re-run with --force');
  });

  it('does not suggest --force for a conflict that does not mention it', async () => {
    const { dependencies, stderr } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(createApiError(409, { error: 'Repository is not a standalone checkout.' })),
    });

    expect(await runCli(remove('--path', 'repos/web'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stderr.join('')).not.toContain('Re-run with --force');
  });

  it('does not add the hint to errors other than a conflict', async () => {
    const { dependencies, stderr } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(createApiError(404, { error: 'force not relevant here' })),
    });

    expect(await runCli(remove('--path', 'repos/web'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stderr.join('')).not.toContain('Re-run with --force');
  });

  it('fails without success text when the backend is unreachable', async () => {
    const { dependencies, stdout } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    expect(await runCli(remove('--path', 'repos/web'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi project monospecs set (registerProjectMonoSpecsSetCommand)', () => {
  const set = (...args: string[]) => monospecs('set', '--id', 'p', ...args);
  const savedBody = (api: ReturnType<typeof createDependencies>['api']) => vi.mocked(api.saveMonoSpecsManagement).mock.calls[0][1];

  it('changes the version and repository directory together and keeps commitWhenArchive', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(set('--version', '2.0', '--repo-directory', 'checkouts'), dependencies)).toBe(0);
    expect(savedBody(api)).toMatchObject({ version: '2.0', repoDirectory: 'checkouts', commitWhenArchive: false });
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('accepts --commit-when-archive %s', async (given, expected) => {
    const { dependencies, api } = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ commitWhenArchive: !expected })),
    });

    expect(await runCli(set('--commit-when-archive', given), dependencies)).toBe(0);
    expect(savedBody(api)).toMatchObject({ commitWhenArchive: expected });
  });

  it.each(['TRUE', 'yes', '1', ''])('rejects --commit-when-archive %j before any request', async given => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(set('--commit-when-archive', given), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--commit-when-archive must be true or false.');
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('names the last path segment as the repository name when --name is not given', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(set('--add-repository', 'repos/tools/helper'), dependencies)).toBe(0);
    const added = savedBody(api).repositories?.at(-1);
    expect(added).toMatchObject({ name: 'helper', path: 'repos/tools/helper', url: null, displayName: null, type: null, optional: false });
  });

  it('applies --name, --display-name, --type and --url to the single added repository', async () => {
    const { dependencies, api } = createDependencies();

    expect(
      await runCli(
        set('--add-repository', 'repos/new', '--name', 'fresh', '--display-name', 'Fresh', '--type', 'service', '--url', 'https://example.test/new.git'),
        dependencies,
      ),
    ).toBe(0);
    expect(savedBody(api).repositories?.at(-1)).toMatchObject({
      name: 'fresh',
      displayName: 'Fresh',
      type: 'service',
      url: 'https://example.test/new.git',
    });
  });

  it('normalises added and removed paths before comparing them with the configured ones', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(set('--remove-repository', '.\\repos\\web\\', '--add-repository', './repos/extra/'), dependencies)).toBe(0);
    const paths = savedBody(api).repositories?.map(repository => repository.path);
    expect(paths).toContain('repos/extra');
    expect(paths).not.toContain('repos/web');
    expect(paths).toContain('repos/cli');
  });

  it('adds several repositories in the order given', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(set('--add-repository', 'repos/one', '--add-repository', 'repos/two'), dependencies)).toBe(0);
    expect(savedBody(api).repositories?.slice(-2).map(repository => repository.name)).toEqual(['one', 'two']);
  });

  it('rejects an invalid repository path before any request', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(set('--add-repository', '.'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Repository path must name a directory');
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('names every companion option in the single-repository message', async () => {
    const { dependencies, stderr } = createDependencies();

    expect(await runCli(set('--version', '2', '--name', 'x', '--type', 'y'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--name, --type apply to a single --add-repository only.');
  });

  it('rejects a whitespace-only project id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('set', '--id', ' ', '--version', '2'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('prints the saved document under a saved heading in human mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(set('--version', '2'), dependencies)).toBe(0);
    expect(stdout.join('')).toMatch(/^MonoSpecs configuration saved\.\n/);
  });

  it('prints the saved document as JSON, without a clone block when not cloning', async () => {
    const { dependencies, stdout } = createDependencies({
      saveMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ version: '9.9' })),
    });

    expect(await runCli(set('--version', '9.9', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(body.version).toBe('9.9');
    expect(body).not.toHaveProperty('clone');
  });

  it('adds the clone results to the JSON document with --clone', async () => {
    const { dependencies, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({ results: [{ path: 'repos/new', status: 'cloned', message: 'ok' }] }),
    });

    expect(await runCli(set('--add-repository', 'repos/new', '--clone', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).clone).toEqual({ results: [{ path: 'repos/new', status: 'cloned', message: 'ok' }] });
  });

  it('prints the clone results after the saved document in human mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(set('--add-repository', 'repos/new', '--clone'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Clone results');
  });

  it('treats a clone answer without results as nothing cloned', async () => {
    const { dependencies, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({}),
    });

    expect(await runCli(set('--add-repository', 'repos/new', '--clone', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).clone).toEqual({ results: [] });
  });

  it('keeps the saved document and fails when the clone request itself fails', async () => {
    const { dependencies, stdout, api } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    expect(await runCli(set('--add-repository', 'repos/new', '--clone'), dependencies)).not.toBe(0);
    expect(api.saveMonoSpecsManagement).toHaveBeenCalledTimes(1);
    expect(stdout.join('')).toMatch(/^MonoSpecs configuration saved\./);
  });

  it('does not clone or print a saved document when the save is rejected', async () => {
    const { dependencies, stdout, api } = createDependencies({
      saveMonoSpecsManagement: vi.fn().mockRejectedValue(createApiError(400, { error: 'Invalid configuration.' })),
    });

    expect(await runCli(set('--add-repository', 'repos/new', '--clone'), dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(api.cloneMonoSpecsRepositories).not.toHaveBeenCalled();
    expect(stdout.join('')).toBe('');
  });
});

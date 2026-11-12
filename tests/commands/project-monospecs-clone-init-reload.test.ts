import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerProjectMonoSpecsCloneCommand } from '../../src/commands/project/monospecs/clone';
import { registerProjectMonoSpecsInitCommand } from '../../src/commands/project/monospecs/init';
import { registerProjectMonoSpecsReloadCommand } from '../../src/commands/project/monospecs/reload';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createMonoSpecsDocument } from './testHelpers';

const monospecs = (...args: string[]) => ['node', 'hagi', 'project', 'monospecs', ...args];

describe('registration functions', () => {
  it('are exported for the monospecs group', () => {
    expect(typeof registerProjectMonoSpecsCloneCommand).toBe('function');
    expect(typeof registerProjectMonoSpecsInitCommand).toBe('function');
    expect(typeof registerProjectMonoSpecsReloadCommand).toBe('function');
  });
});

describe('hagi project monospecs clone (registerProjectMonoSpecsCloneCommand)', () => {
  it('sends only includeOptional false when no path is given', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('clone', '--id', ' project-1 '), dependencies)).toBe(0);
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledExactlyOnceWith('project-1', { includeOptional: false });
  });

  it('sends the paths and the includeOptional flag together', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('clone', '--id', 'p', '--path', 'repos/a', '--path', 'repos/b', '--include-optional'), dependencies)).toBe(0);
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledWith('p', { paths: ['repos/a', 'repos/b'], includeOptional: true });
  });

  it.each([
    ['  repos/a  ', 'repos/a'],
    ['./repos/a', 'repos/a'],
    ['././repos/a', 'repos/a'],
    ['repos/a/', 'repos/a'],
    ['repos\\a\\b', 'repos/a/b'],
    ['.\\repos\\a\\', 'repos/a'],
  ])('normalises the path %j to %j', async (given, expected) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('clone', '--id', 'p', '--path', given), dependencies)).toBe(0);
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledWith('p', { paths: [expected], includeOptional: false });
  });

  it.each(['', '   ', '.', './', '/'])('rejects the path %j before any network call', async given => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(monospecs('clone', '--id', 'p', '--path', given), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Repository path must name a directory below the project root');
    expect(api.cloneMonoSpecsRepositories).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only project id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(monospecs('clone', '--id', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.cloneMonoSpecsRepositories).not.toHaveBeenCalled();
  });

  it('fails without --id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('clone'), dependencies)).not.toBe(0);
    expect(api.cloneMonoSpecsRepositories).not.toHaveBeenCalled();
  });

  it('says so when nothing was selected for cloning', async () => {
    const { dependencies, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({ results: [] }),
    });

    expect(await runCli(monospecs('clone', '--id', 'p'), dependencies)).toBe(0);
    expect(stdout.join('')).toBe('No repositories were selected for cloning.\n');
  });

  it('prints a missing result list as no results', async () => {
    const { dependencies, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({}),
    });

    expect(await runCli(monospecs('clone', '--id', 'p', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ results: [] });
  });

  it('exits 0 when every result succeeded or was skipped', async () => {
    const { dependencies } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
        results: [
          { path: 'repos/a', status: 'cloned', message: 'ok' },
          { path: 'repos/b', status: 'skipped', message: 'exists' },
        ],
      }),
    });

    expect(await runCli(monospecs('clone', '--id', 'p'), dependencies)).toBe(0);
  });

  it('prints the results as JSON and still exits 30 when a clone failed', async () => {
    const { dependencies, stdout, stderr } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
        results: [
          { path: 'repos/a', status: 'cloned' },
          { path: 'repos/b', status: 'failed', message: 'auth' },
          { path: 'repos/c', status: 'failed', message: 'network' },
        ],
      }),
    });

    expect(await runCli(monospecs('clone', '--id', 'p', '--json'), dependencies)).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(JSON.parse(stdout.join('')).results.map((r: { status: string }) => r.status)).toEqual(['cloned', 'failed', 'failed']);
    expect(stderr.join('')).toContain('2 repository clone(s) failed.');
  });

  it('fills missing result fields with empty values', async () => {
    const { dependencies, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({ results: [{}] }),
    });

    expect(await runCli(monospecs('clone', '--id', 'p', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).results[0]).toMatchObject({ path: '', status: '' });
  });

  it('maps an unknown project to the not-found exit code', async () => {
    const { dependencies } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockRejectedValue(createApiError(404, { error: 'Project not found.' })),
    });

    expect(await runCli(monospecs('clone', '--id', 'missing'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });
});

describe('hagi project monospecs init (registerProjectMonoSpecsInitCommand)', () => {
  it('initialises the trimmed project id and prints the heading before the document', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(monospecs('init', '--id', ' project-1 '), dependencies)).toBe(0);
    expect(api.initializeMonoSpecsManagement).toHaveBeenCalledExactlyOnceWith('project-1');
    expect(stdout.join('')).toMatch(/^MonoSpecs configuration initialized\.\n/);
  });

  it('prints only the document payload as JSON, without the heading', async () => {
    const { dependencies, stdout } = createDependencies({
      initializeMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ version: '2.0', repositories: [] })),
    });

    expect(await runCli(monospecs('init', '--id', 'p', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(body.version).toBe('2.0');
    expect(stdout.join('')).not.toContain('initialized');
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('init', '--id', ' '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.initializeMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('maps a rejected configuration to the bad-request exit code and prints no document', async () => {
    const { dependencies, stdout } = createDependencies({
      initializeMonoSpecsManagement: vi.fn().mockRejectedValue(createApiError(400, { error: 'Invalid configuration.' })),
    });

    expect(await runCli(monospecs('init', '--id', 'p'), dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi project monospecs reload (registerProjectMonoSpecsReloadCommand)', () => {
  it('reloads the trimmed project id and prints the heading before the document', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(monospecs('reload', '--id', ' project-1 '), dependencies)).toBe(0);
    expect(api.reloadMonoSpecsManagement).toHaveBeenCalledExactlyOnceWith('project-1');
    expect(stdout.join('')).toMatch(/^MonoSpecs configuration reloaded\.\n/);
  });

  it('prints only the document payload as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      reloadMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ version: '3.1' })),
    });

    expect(await runCli(monospecs('reload', '--id', 'p', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).version).toBe('3.1');
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(monospecs('reload', '--id', ' '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.reloadMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('fails without success text when the backend is unreachable', async () => {
    const { dependencies, stdout } = createDependencies({
      reloadMonoSpecsManagement: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    expect(await runCli(monospecs('reload', '--id', 'p'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

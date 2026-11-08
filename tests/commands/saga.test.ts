import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { parseSagaSelector, resolveSagaCommandContext } from '../../src/commands/saga/shared';
import { getActiveRuntime } from '../../src/runtime/apiRuntime';
import { EXIT_CODES } from '../../src/runtime/errors';
import { loadSagaAssets } from '../../src/runtime/saga/assets';
import { installSagaResources } from '../../src/runtime/saga/install';
import { resolveLocalSagaProjectPath } from '../../src/runtime/saga/project';
import { createApiError, createDependencies, createProject } from './testHelpers';

function createSagaCommand(options: Record<string, string | boolean>): Command {
  const program = new Command()
    .option('--base-url <url>')
    .option('--token <token>')
    .option('--lang <lang>');
  const saga = program.command('saga');
  const command = saga
    .command('list')
    .option('--path <directory>')
    .option('--project-id <id>')
    .option('--json');

  for (const [key, value] of Object.entries(options)) {
    if (['baseUrl', 'token', 'lang'].includes(key)) {
      program.setOptionValue(key, value);
    } else {
      command.setOptionValue(key, value);
    }
  }
  return command;
}

function snapshotTree(root: string) {
  const entries: Array<Record<string, string | number>> = [];
  function visit(target: string, relativePath: string): void {
    const stat = lstatSync(target);
    const directory = stat.isDirectory();
    entries.push({
      path: relativePath,
      type: directory ? 'directory' : stat.isFile() ? 'file' : 'other',
      mode: stat.mode,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      ...(stat.isFile() ? { bytes: readFileSync(target).toString('base64') } : {}),
    });
    if (directory) {
      for (const entry of readdirSync(target).sort()) {
        visit(path.join(target, entry), path.posix.join(relativePath, entry));
      }
    }
  }
  visit(root, '.');
  return entries;
}

describe('Saga command registration', () => {
  it('registers only the five supported commands with their required options', async () => {
    const { dependencies, stdout } = createDependencies();
    expect(await runCli(['node', 'hagi', 'saga', '--help'], dependencies)).toBe(0);
    for (const command of ['init', 'new', 'list', 'status', 'items']) {
      expect(stdout.join('')).toMatch(new RegExp(`\\b${command}\\b`));
    }

    const init = createDependencies();
    expect(await runCli(['node', 'hagi', 'saga', 'init', '--help'], init.dependencies)).toBe(0);
    expect(init.stdout.join('')).toContain('--path <directory>');
    expect(init.stdout.join('')).toContain('--project-id <id>');
    expect(init.stdout.join('')).toContain('--force');
    expect(init.stdout.join('')).toContain('--json');

    const create = createDependencies();
    expect(await runCli(['node', 'hagi', 'saga', 'new', '--help'], create.dependencies)).toBe(0);
    expect(create.stdout.join('')).toContain('<saga-id>');
    expect(create.stdout.join('')).not.toContain('--force');

    const status = createDependencies();
    expect(await runCli(['node', 'hagi', 'saga', 'status', '--help'], status.dependencies)).toBe(0);
    expect(status.stdout.join('')).toContain('<saga-id>');
  });

  it('rejects unknown contract commands and missing required Saga IDs as usage errors', async () => {
    const unknown = createDependencies();
    expect(
      await runCli(['node', 'hagi', 'saga', 'freeze', '--path', '/tmp/project'], unknown.dependencies),
    ).toBe(EXIT_CODES.USAGE);
    expect(unknown.api.listProjects).not.toHaveBeenCalled();

    for (const args of [
      ['new', '--path', '/tmp/project'],
      ['status', '--path', '/tmp/project'],
      ['items', '--path', '/tmp/project'],
    ]) {
      const { dependencies, api } = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', ...args], dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.listProjects).not.toHaveBeenCalled();
    }
  });

  it('accepts shared runtime flags and JSON output on every Saga command', async () => {
    for (const command of ['init', 'new', 'list', 'status', 'items']) {
      const { dependencies } = createDependencies();
      expect(
        await runCli(
          [
            'node',
            'hagi',
            'saga',
            command,
            '--base-url',
            'https://backend.test',
            '--token',
            'test-token',
            '--lang',
            'en-US',
            '--json',
            '--help',
          ],
          dependencies,
        ),
      ).toBe(0);
    }
  });

  it('rejects missing, conflicting, and empty selectors before backend access or writes', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-selectors-'));
    const projectPath = path.join(temporaryRoot, 'Project With Spaces');
    mkdirSync(projectPath);
    const commandArgs = [
      ['init'],
      ['new', 'demo'],
      ['list'],
      ['status', 'demo'],
      ['items', 'demo'],
    ];
    const invalidSelectors = [
      [],
      ['--path', projectPath, '--project-id', 'project-1'],
      ['--path', ''],
      ['--project-id', ''],
    ];

    try {
      for (const command of commandArgs) {
        for (const selectorArgs of invalidSelectors) {
          const { dependencies, api, stderr } = createDependencies();
          dependencies.env = { XDG_CONFIG_HOME: path.join(temporaryRoot, 'no-config') };
          expect(
            await runCli(['node', 'hagi', 'saga', ...command, ...selectorArgs], dependencies),
          ).toBe(EXIT_CODES.USAGE);
          expect(stderr.join('')).toMatch(/exactly one|must not be empty/);
          expect(stderr.join('')).not.toContain('No backend base URL');
          expect(api.listProjects).not.toHaveBeenCalled();
        }
      }
      expect(readdirSync(temporaryRoot)).toEqual(['Project With Spaces']);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('preserves raw local paths with spaces', () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-path-'));
    const rawPath = path.join(temporaryRoot, ' Project With Spaces ');
    mkdirSync(rawPath);
    try {
      expect(parseSagaSelector({ path: rawPath })).toEqual({ kind: 'path', value: rawPath });
      expect(resolveLocalSagaProjectPath(rawPath)).toBe(realpathSync(rawPath));
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('keeps every local Saga action independent of absent, invalid, and unreachable backend settings', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-offline-'));
    const absentConfigHome = path.join(temporaryRoot, 'absent-config');
    const configHome = path.join(temporaryRoot, 'bad-config');
    mkdirSync(path.join(configHome, 'hagi'), { recursive: true });
    writeFileSync(path.join(configHome, 'hagi', 'config.json'), '{invalid');
    const scenarios = [
      { name: 'No Backend', env: { XDG_CONFIG_HOME: absentConfigHome }, flags: [] },
      {
        name: 'Invalid Backend',
        env: { XDG_CONFIG_HOME: configHome, HAGI_API_BASE_URL: 'not-a-valid-backend-url' },
        flags: [],
      },
      {
        name: 'Unreachable Backend',
        env: { XDG_CONFIG_HOME: absentConfigHome },
        flags: ['--base-url', 'http://127.0.0.1:1'],
      },
    ];
    try {
      for (const scenario of scenarios) {
        const projectPath = path.join(temporaryRoot, `${scenario.name} Project With Spaces`);
        mkdirSync(projectPath);
        for (const action of [
          ['init'],
          ['new', 'demo'],
          ['list'],
          ['status', 'demo'],
          ['items', 'demo'],
        ]) {
          const { dependencies, api, stderr } = createDependencies();
          dependencies.env = scenario.env;
          expect(
            await runCli(
              ['node', 'hagi', 'saga', ...action, '--path', projectPath, '--json', ...scenario.flags],
              dependencies,
            ),
          ).toBe(0);
          expect(stderr.join('')).not.toContain('config file');
          expect(api.listProjects).not.toHaveBeenCalled();
        }
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('uses native relative resolution and preserves Windows drive, UNC, and separator strings', () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-relative-'));
    const projectPath = path.join(temporaryRoot, 'Relative Project');
    const previousDirectory = process.cwd();
    mkdirSync(projectPath);
    try {
      process.chdir(temporaryRoot);
      expect(resolveLocalSagaProjectPath('Relative Project')).toBe(realpathSync(projectPath));
      for (const rawPath of [
        'C:\\Users\\Saga Project',
        '\\\\server\\share\\Saga Project',
        'folder\\nested/project',
      ]) {
        expect(parseSagaSelector({ path: rawPath })).toEqual({ kind: 'path', value: rawPath });
      }
    } finally {
      process.chdir(previousDirectory);
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('resolves the exact backend project path and applies shared runtime precedence', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-project-'));
    const projectPath = path.join(temporaryRoot, 'Project With Spaces');
    const configHome = path.join(temporaryRoot, 'config');
    mkdirSync(projectPath);
    mkdirSync(path.join(configHome, 'hagi'), { recursive: true });
    writeFileSync(path.join(configHome, 'hagi', 'config.json'), JSON.stringify({ baseUrl: 'https://config.test' }));

    try {
      const { dependencies, api } = createDependencies({
        listProjects: vi.fn().mockResolvedValue({
          projects: [
            { ...createProject('other-project'), path: path.join(temporaryRoot, 'not-selected') },
            { ...createProject('project-1'), path: projectPath },
          ],
        }),
      });
      dependencies.env = {
        HAGI_API_BASE_URL: 'https://env.test',
        HAGI_API_TOKEN: 'env-token',
        HAGI_API_LANG: 'en-US',
        XDG_CONFIG_HOME: configHome,
      };

      const command = createSagaCommand({
        projectId: ' project-1 ',
        baseUrl: 'https://flag.test',
        token: 'flag-token',
        lang: 'fr-FR',
        json: true,
      });
      const context = await resolveSagaCommandContext(command, dependencies);
      expect(context.projectDirectory).toBe(realpathSync(projectPath));
      expect(context.selector).toEqual({ kind: 'project-id', value: 'project-1' });
      expect(context.outputJson).toBe(true);
      expect(api.listProjects).toHaveBeenCalledOnce();
      expect(getActiveRuntime()).toEqual({
        baseUrl: 'https://flag.test',
        token: 'flag-token',
        lang: 'fr-FR',
      });

      await resolveSagaCommandContext(createSagaCommand({ projectId: 'project-1' }), dependencies);
      expect(getActiveRuntime()).toEqual({
        baseUrl: 'https://env.test',
        token: 'env-token',
        lang: 'en-US',
      });
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('maps missing projects, absent host paths, and invalid local directories explicitly', async () => {
    const missingProject = createDependencies({
      listProjects: vi.fn().mockResolvedValue({ projects: [] }),
    });
    expect(
      await runCli(['node', 'hagi', 'saga', 'list', '--project-id', 'missing'], missingProject.dependencies),
    ).toBe(EXIT_CODES.HTTP_NOT_FOUND);

    const absentPath = createDependencies({
      listProjects: vi.fn().mockResolvedValue({
        projects: [{ ...createProject('project-1'), path: undefined }],
      }),
    });
    expect(
      await runCli(['node', 'hagi', 'saga', 'list', '--project-id', 'project-1'], absentPath.dependencies),
    ).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(absentPath.stderr.join('')).toContain('no host-local project path');

    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-invalid-path-'));
    const filePath = path.join(temporaryRoot, 'project-file');
    writeFileSync(filePath, 'not a directory');
    try {
      for (const invalidPath of [path.join(temporaryRoot, 'missing'), filePath]) {
        const { dependencies, api, stderr } = createDependencies();
        expect(
          await runCli(['node', 'hagi', 'saga', 'list', '--path', invalidPath], dependencies),
        ).toBe(EXIT_CODES.OPERATION_FAILED);
        expect(stderr.join('')).toContain(invalidPath);
        expect(api.listProjects).not.toHaveBeenCalled();

        const backendPath = createDependencies({
          listProjects: vi.fn().mockResolvedValue({
            projects: [{ ...createProject('project-1'), path: invalidPath }],
          }),
        });
        expect(
          await runCli(['node', 'hagi', 'saga', 'list', '--project-id', 'project-1'], backendPath.dependencies),
        ).toBe(EXIT_CODES.OPERATION_FAILED);
        expect(backendPath.stderr.join('')).toContain(invalidPath);
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('preserves existing backend status and transport error mappings', async () => {
    const forbidden = createDependencies({
      listProjects: vi.fn().mockRejectedValue(createApiError(403, { error: 'Forbidden' })),
    });
    expect(
      await runCli(['node', 'hagi', 'saga', 'list', '--project-id', 'project-1'], forbidden.dependencies),
    ).toBe(EXIT_CODES.HTTP_FORBIDDEN);

    const unreachable = createDependencies({
      listProjects: vi.fn().mockRejectedValue(new Error('fetch failed')),
    });
    expect(
      await runCli(['node', 'hagi', 'saga', 'list', '--project-id', 'project-1'], unreachable.dependencies),
    ).toBe(EXIT_CODES.TRANSPORT);
  });

  it('prints init outcomes and maps preserved resource conflicts to exit code 4', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-init-command-'));
    const projectPath = path.join(temporaryRoot, 'Project With Spaces');
    const conflictPath = path.join(projectPath, '.hagicode/sagas/prompts/goal.md');
    mkdirSync(path.dirname(conflictPath), { recursive: true });
    writeFileSync(conflictPath, 'custom prompt');

    try {
      const { dependencies, stdout, stderr, api } = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'init', '--path', projectPath], dependencies),
      ).toBe(4);
      expect(stdout.join('')).toContain('conflict  prompts/goal.md');
      expect(stdout.join('')).toContain('created');
      expect(stderr.join('')).toContain('Saga resources conflict with existing files');
      expect(stderr.join('')).toContain('--force');
      expect(api.listProjects).not.toHaveBeenCalled();
      expect(existsSync(path.join(projectPath, '.hagicode/sagas/prompts/research.md'))).toBe(true);

      const forced = createDependencies();
      expect(
        await runCli(
          ['node', 'hagi', 'saga', 'init', '--path', projectPath, '--force', '--json'],
          forced.dependencies,
        ),
      ).toBe(0);
      const report = JSON.parse(forced.stdout.join(''));
      expect(report.force).toBe(true);
      expect(report.conflicts).toEqual([]);
      expect(report.files).toContainEqual({ path: 'prompts/goal.md', outcome: 'replaced' });
      expect(report.files.every((file: { path: string; outcome: string }) =>
        ['created', 'unchanged', 'merged', 'replaced'].includes(file.outcome),
      )).toBe(true);
      expect(forced.stderr).toEqual([]);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('creates canonical Sagas in human and JSON modes and suppresses success output on refusal', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-new-command-'));
    const projectPath = path.join(temporaryRoot, 'Project With Spaces');
    const incompleteProject = path.join(temporaryRoot, 'Incomplete Project');
    const failingProject = path.join(temporaryRoot, 'Failing Project');
    mkdirSync(projectPath);
    mkdirSync(incompleteProject);
    mkdirSync(failingProject);

    try {
      installSagaResources(projectPath, loadSagaAssets());
      const human = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'new', 'demo', '--path', projectPath], human.dependencies),
      ).toBe(0);
      expect(human.stdout.join('')).toContain('Saga created');
      expect(human.stdout.join('')).toContain('id         demo');
      expect(human.stdout.join('')).toContain(path.join(projectPath, '.hagicode/sagas/demo'));
      expect(human.stdout.join('')).toContain('then write goal.md, research.md, acceptance.md and progress.md');
      expect(human.stdout.join('')).not.toContain('CREATED');

      const json = createDependencies();
      expect(
        await runCli(
          ['node', 'hagi', 'saga', 'new', 'json-demo', '--path', projectPath, '--json'],
          json.dependencies,
        ),
      ).toBe(0);
      const result = JSON.parse(json.stdout.join(''));
      expect(result.id).toBe('json-demo');
      expect(result.directory).toBe(path.join(projectPath, '.hagicode/sagas/json-demo'));
      expect(result.metadata).toMatchObject({ id: 'json-demo', method: 1 });
      expect(result.metadata.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
      expect(json.stdout.join('')).not.toContain('CREATED');
      expect(json.stderr).toEqual([]);

      const invalid = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'new', 'Uppercase', '--path', projectPath], invalid.dependencies),
      ).toBe(EXIT_CODES.USAGE);
      expect(invalid.stdout).toEqual([]);
      expect(invalid.stderr.join('')).toContain('Invalid Saga ID');

      const collision = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'new', 'demo', '--path', projectPath], collision.dependencies),
      ).toBe(EXIT_CODES.OPERATION_FAILED);
      expect(collision.stdout).toEqual([]);
      expect(collision.stderr.join('')).toContain('already exists');

      const incomplete = createDependencies();
      expect(
        await runCli(
          ['node', 'hagi', 'saga', 'new', 'demo', '--path', incompleteProject],
          incomplete.dependencies,
        ),
      ).toBe(EXIT_CODES.OPERATION_FAILED);
      expect(incomplete.stdout).toEqual([]);
      expect(incomplete.stderr.join('')).toContain(`hagi saga init --path "${incompleteProject}"`);

      installSagaResources(failingProject, loadSagaAssets());
      // Creation is native: no installed tool is needed, and none is installed.
      expect(existsSync(path.join(failingProject, '.hagicode/sagas/tools'))).toBe(false);
      const native = createDependencies();
      expect(
        await runCli(
          ['node', 'hagi', 'saga', 'new', 'demo', '--path', failingProject, '--json'],
          native.dependencies,
        ),
      ).toBe(0);
      expect(JSON.parse(native.stdout.join('')).metadata).toMatchObject({ id: 'demo', method: 1 });
      expect(native.stderr).toEqual([]);
      expect(existsSync(path.join(failingProject, '.hagicode/sagas/demo/saga.json'))).toBe(true);
      expect(existsSync(path.join(failingProject, '.hagicode/sagas/demo/runtime'))).toBe(false);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('formats read-only list, status, and item queries in human and canonical JSON modes', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-query-command-'));
    const projectPath = path.join(temporaryRoot, 'Project With Spaces');
    const emptyProject = path.join(temporaryRoot, 'Empty Project');
    const sagaDirectory = path.join(projectPath, '.hagicode/sagas/demo');
    mkdirSync(path.join(sagaDirectory, 'runtime'), { recursive: true });
    mkdirSync(emptyProject);
    writeFileSync(path.join(sagaDirectory, 'goal.md'), 'Goal\n');
    writeFileSync(path.join(sagaDirectory, 'progress.md'), '- [ ] item Build | evidence/item.log\n');
    writeFileSync(path.join(sagaDirectory, 'acceptance.md'), '## item\ncmd: npm test\n');
    writeFileSync(path.join(sagaDirectory, 'runtime/blocked.json'), '{"item":"waiting"}');

    try {
      const listJson = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'list', '--path', projectPath, '--json'], listJson.dependencies),
      ).toBe(0);
      const listPayload = JSON.parse(listJson.stdout.join(''));
      expect(Object.keys(listPayload)).toEqual(['sagas']);
      expect(listPayload.sagas[0]).toMatchObject({
        sagaId: 'demo',
        state: 'draft',
        revision: 0,
        counts: { total: 1, blocked: 1 },
      });

      const listHuman = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'list', '--path', projectPath], listHuman.dependencies)).toBe(0);
      expect(listHuman.stdout.join('')).toContain('Active Sagas (1)');
      expect(listHuman.stdout.join('')).toContain('demo  draft  revision 0');

      const statusJson = createDependencies();
      expect(
        await runCli(
          ['node', 'hagi', 'saga', 'status', 'demo', '--path', projectPath, '--json'],
          statusJson.dependencies,
        ),
      ).toBe(0);
      const statusPayload = JSON.parse(statusJson.stdout.join(''));
      expect(statusPayload.schema).toBe('saga-status/2');
      expect(statusPayload.sagaId).toBe('demo');
      expect(statusPayload.nextArtifact).toBe('research');
      expect(statusPayload.note).toBe('');
      expect(statusPayload.status).toBeUndefined();

      const statusHuman = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'status', 'demo', '--path', projectPath], statusHuman.dependencies),
      ).toBe(0);
      expect(statusHuman.stdout.join('')).toContain('artifacts goal=written');
      expect(statusHuman.stdout.join('')).toContain('next artifact research');
      expect(statusHuman.stdout.join('')).toContain('read ');
      expect(statusHuman.stdout.join('')).toContain('/prompts/research.md');

      const itemsJson = createDependencies();
      expect(
        await runCli(
          ['node', 'hagi', 'saga', 'items', 'demo', '--path', projectPath, '--json'],
          itemsJson.dependencies,
        ),
      ).toBe(0);
      expect(JSON.parse(itemsJson.stdout.join(''))).toEqual({
        sagaId: 'demo',
        items: [{ id: 'item', title: 'Build', state: 'blocked', cmd: 'npm test', note: 'evidence/item.log' }],
      });

      const itemsHuman = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'items', 'demo', '--path', projectPath], itemsHuman.dependencies),
      ).toBe(0);
      expect(itemsHuman.stdout.join('')).toContain('Saga demo items (1)');
      expect(itemsHuman.stdout.join('')).toContain('[blocked] item Build | cmd: npm test | note: evidence/item.log');

      const emptyList = createDependencies();
      expect(
        await runCli(['node', 'hagi', 'saga', 'list', '--path', emptyProject, '--json'], emptyList.dependencies),
      ).toBe(0);
      expect(JSON.parse(emptyList.stdout.join(''))).toEqual({ sagas: [] });
      const emptyHuman = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'list', '--path', emptyProject], emptyHuman.dependencies)).toBe(0);
      expect(emptyHuman.stdout.join('')).toContain('No active Sagas found.');

      for (const command of ['status', 'items']) {
        const missing = createDependencies();
        expect(
          await runCli(['node', 'hagi', 'saga', command, 'missing', '--path', projectPath], missing.dependencies),
        ).toBe(EXIT_CODES.HTTP_NOT_FOUND);
        expect(missing.stdout).toEqual([]);
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it('leaves every query fixture unchanged in human and JSON modes', async () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-readonly-command-'));
    const emptyProject = path.join(temporaryRoot, 'Empty Project');
    const projectPath = path.join(temporaryRoot, 'Project Without Runtime');
    const staleProject = path.join(temporaryRoot, 'Stale Project');
    const malformedProject = path.join(temporaryRoot, 'Malformed Project');
    mkdirSync(emptyProject);
    for (const project of [projectPath, staleProject, malformedProject]) {
      const sagaDirectory = path.join(project, '.hagicode/sagas/demo');
      mkdirSync(sagaDirectory, { recursive: true });
      writeFileSync(path.join(sagaDirectory, 'progress.md'), '- [ ] item Inspect | evidence/item.log\n');
      writeFileSync(path.join(sagaDirectory, 'acceptance.md'), '## item\ncmd: true\n');
      writeFileSync(path.join(sagaDirectory, 'goal.md'), 'Goal\n');
    }
    mkdirSync(path.join(staleProject, '.hagicode/sagas/demo/runtime'), { recursive: true });
    writeFileSync(path.join(staleProject, '.hagicode/sagas/demo/runtime/status.json'), '{"state":"paused","note":"stale","updatedAt":"2000-01-01T00:00:00Z"}');
    mkdirSync(path.join(malformedProject, '.hagicode/sagas/demo/runtime'), { recursive: true });
    writeFileSync(path.join(malformedProject, '.hagicode/sagas/demo/runtime/blocked.json'), '{invalid');
    const queries = [['list'], ['status', 'demo'], ['items', 'demo']];

    try {
      for (const [command, root] of [
        ['list', emptyProject],
        ...queries.map(command => [command[0], projectPath]),
        ...queries.map(command => [command[0], staleProject]),
      ]) {
        for (const json of [false, true]) {
          const before = snapshotTree(root);
          const dependencies = createDependencies();
          expect(
            await runCli(
              ['node', 'hagi', 'saga', command, ...(command === 'list' ? [] : ['demo']), '--path', root, ...(json ? ['--json'] : [])],
              dependencies.dependencies,
            ),
          ).toBe(0);
          expect(snapshotTree(root)).toEqual(before);
        }
      }

      for (const [command, root] of queries.map(command => [command[0], malformedProject])) {
        for (const json of [false, true]) {
          const before = snapshotTree(root);
          const result = createDependencies();
          expect(
            await runCli(
              ['node', 'hagi', 'saga', command, ...(command === 'list' ? [] : ['demo']), '--path', root, ...(json ? ['--json'] : [])],
              result.dependencies,
            ),
          ).toBe(EXIT_CODES.OPERATION_FAILED);
          expect(result.stderr.join('')).toContain(path.join(root, '.hagicode/sagas/demo/runtime/blocked.json'));
          expect(snapshotTree(root)).toEqual(before);
        }
      }
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });
});

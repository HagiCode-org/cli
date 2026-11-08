import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../..');
const resourcePaths = [
  'resources/saga/install/gitignore.template',
  'resources/saga/manifest.json',
  'resources/saga/prompts/acceptance.md',
  'resources/saga/prompts/amend.md',
  'resources/saga/prompts/goal.md',
  'resources/saga/prompts/plan.md',
  'resources/saga/prompts/research.md',
  'resources/saga/prompts/run.md',
];

function runNode(script: string, args: string[], cwd: string, env: NodeJS.ProcessEnv) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    shell: false,
  });
  if (result.error) {
    throw result.error;
  }
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

function writeProjectFile(sagaRoot: string, relativePath: string, contents: string): void {
  const filePath = path.join(sagaRoot, ...relativePath.split('/'));
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, contents);
}

function snapshotTree(root: string) {
  const snapshot: Array<Record<string, string | number>> = [];
  function visit(target: string, relativePath: string): void {
    const stat = lstatSync(target);
    const isDirectory = stat.isDirectory();
    snapshot.push({
      path: relativePath,
      type: isDirectory ? 'directory' : stat.isFile() ? 'file' : 'other',
      mode: stat.mode,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
      ...(stat.isFile() ? { bytes: readFileSync(target).toString('base64') } : {}),
    });
    if (isDirectory) {
      for (const entry of readdirSync(target).sort()) {
        visit(path.join(target, entry), path.posix.join(relativePath, entry));
      }
    }
  }
  visit(root, '.');
  return snapshot;
}

describe('packed Saga acceptance', () => {
  let temporaryRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-package-'));
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('packs, extracts, and runs all Saga operations offline from the published resources', () => {
    const packageRoot = path.join(temporaryRoot, 'package');
    const packDirectory = path.join(temporaryRoot, 'pack');
    const extractDirectory = path.join(temporaryRoot, 'extract');
    const cacheDirectory = path.join(temporaryRoot, 'npm-cache');
    const unrelatedDirectory = path.join(temporaryRoot, 'unrelated working directory');
    const projectPath = path.join(temporaryRoot, 'Local Project With Spaces');
    const untrustedSagaRoot = path.join(temporaryRoot, 'must not be used');
    mkdirSync(packageRoot);
    mkdirSync(packDirectory);
    mkdirSync(extractDirectory);
    mkdirSync(unrelatedDirectory);
    mkdirSync(projectPath);

    cpSync(path.join(repoRoot, 'package.json'), path.join(packageRoot, 'package.json'));
    cpSync(path.join(repoRoot, 'README.md'), path.join(packageRoot, 'README.md'));
    cpSync(path.join(repoRoot, 'resources/saga'), path.join(packageRoot, 'resources/saga'), { recursive: true });
    cpSync(path.join(repoRoot, 'skills'), path.join(packageRoot, 'skills'), { recursive: true });
    execFileSync('pnpm', ['exec', 'vite', 'build', '--outDir', path.join(packageRoot, 'dist'), '--emptyOutDir'], {
      cwd: repoRoot,
      encoding: 'utf8',
    });

    const env = {
      ...process.env,
      npm_config_cache: cacheDirectory,
      npm_config_offline: 'true',
      npm_config_ignore_scripts: 'true',
    };
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const packed = JSON.parse(execFileSync(npm, [
      'pack',
      '--ignore-scripts',
      '--json',
      '--pack-destination',
      packDirectory,
    ], { cwd: packageRoot, env, encoding: 'utf8' }));
    const [summary] = Array.isArray(packed) ? packed : Object.values(packed);
    const packedFiles = summary.files.map((file: { path: string }) => file.path);
    for (const resourcePath of resourcePaths) {
      expect(packedFiles).toContain(resourcePath);
    }

    const archivePath = path.join(packDirectory, summary.filename);
    execFileSync('tar', ['-xzf', archivePath, '-C', extractDirectory]);
    const extractedPackage = path.join(extractDirectory, 'package');
    const sourceManifest = JSON.parse(readFileSync(path.join(repoRoot, 'resources/saga/manifest.json'), 'utf8'));
    const packagedManifest = JSON.parse(
      readFileSync(path.join(extractedPackage, 'resources/saga/manifest.json'), 'utf8'),
    );
    expect(packagedManifest).toEqual(sourceManifest);
    expect(packagedManifest.schemaVersion).toBe(2);
    expect(Object.keys(packagedManifest.install)).toEqual(['install/gitignore.template']);
    expect(Object.keys(packagedManifest.methods)).toEqual(['goal', 'research', 'acceptance', 'plan', 'run', 'amend']);
    const packagedFiles: Array<[string, string]> = [
      ...Object.entries(packagedManifest.install as Record<string, string>),
      ...Object.entries(packagedManifest.methods as Record<string, string>).map(
        ([name, digest]): [string, string] => [`prompts/${name}.md`, digest],
      ),
    ];
    for (const [relativePath, expectedHash] of packagedFiles) {
      const source = readFileSync(path.join(repoRoot, 'resources/saga', relativePath));
      const extracted = readFileSync(path.join(extractedPackage, 'resources/saga', relativePath));
      expect(extracted).toEqual(source);
      expect(createHash('sha256').update(extracted).digest('hex')).toBe(expectedHash);
    }
    for (const assetPath of ['install/gitignore.template', 'manifest.json']) {
      expect(readFileSync(path.join(extractedPackage, 'resources/saga', assetPath))).toEqual(
        readFileSync(path.join(repoRoot, 'resources/saga', assetPath)),
      );
    }

    const cliPath = path.join(extractedPackage, 'dist', 'cli.js');
    const runtimeEnv = {
      ...env,
      XDG_CONFIG_HOME: path.join(temporaryRoot, 'no-backend-config'),
      HAGI_API_BASE_URL: 'not-a-valid-backend-url',
      SAGA_ROOT: untrustedSagaRoot,
    };
    const invoke = (...args: string[]) => runNode(cliPath, args, unrelatedDirectory, runtimeEnv);

    const initial = invoke('saga', 'init', '--path', projectPath, '--json');
    expect(initial.code, `${initial.stderr}\n${initial.stdout}`).toBe(0);
    const initialReport = JSON.parse(initial.stdout);
    expect(initialReport.files).toEqual([{ path: '.gitignore', outcome: 'created' }]);
    expect(initialReport.conflicts).toEqual([]);

    const repeated = invoke('saga', 'init', '--path', projectPath, '--json');
    expect(repeated.code).toBe(0);
    expect(JSON.parse(repeated.stdout).files.every((file: { outcome: string }) => file.outcome === 'unchanged')).toBe(true);

    const sagaRoot = path.join(projectPath, '.hagicode/sagas');
    const goalPath = path.join(sagaRoot, 'prompts/goal.md');
    mkdirSync(path.dirname(goalPath), { recursive: true });
    writeFileSync(goalPath, 'local legacy prompt');
    const legacy = invoke('saga', 'init', '--path', projectPath, '--json');
    expect(legacy.code).toBe(0);
    expect(JSON.parse(legacy.stdout).conflicts).toEqual([]);
    expect(legacy.stdout).not.toContain('prompts');
    expect(readFileSync(goalPath, 'utf8')).toBe('local legacy prompt');

    const forced = invoke('saga', 'init', '--path', projectPath, '--force', '--json');
    expect(forced.code).toBe(0);
    expect(JSON.parse(forced.stdout).conflicts).toEqual([]);
    expect(readFileSync(goalPath, 'utf8')).toBe('local legacy prompt');

    const created = invoke('saga', 'new', 'demo', '--path', projectPath, '--json');
    expect(created.code).toBe(0);
    expect(JSON.parse(created.stdout)).toMatchObject({
      id: 'demo',
      directory: path.join(sagaRoot, 'demo'),
      metadata: { id: 'demo', method: 1 },
    });
    expect(existsSync(path.join(untrustedSagaRoot, 'demo'))).toBe(false);
    const forwardSlashPath = projectPath.replace(/\\/g, '/');
    const separatorQuery = invoke('saga', 'list', '--path', forwardSlashPath, '--json');
    expect(separatorQuery.code).toBe(0);
    expect(JSON.parse(separatorQuery.stdout).sagas).toHaveLength(1);

    expect(readFileSync(goalPath, 'utf8')).toBe('local legacy prompt');
    expect(existsSync(path.join(sagaRoot, 'tools'))).toBe(false);

    if (process.platform === 'win32') {
      const redirectedProject = path.join(temporaryRoot, 'Redirected Project');
      const outsideDirectory = path.join(temporaryRoot, 'Outside Target');
      mkdirSync(redirectedProject);
      mkdirSync(outsideDirectory);
      writeFileSync(path.join(outsideDirectory, 'sentinel.txt'), 'preserve');
      symlinkSync(outsideDirectory, path.join(redirectedProject, '.hagicode'), 'junction');
      const outsideBefore = snapshotTree(outsideDirectory);
      const rejected = invoke('saga', 'init', '--path', redirectedProject, '--json');
      expect(rejected.code).toBe(30);
      expect(rejected.stderr).toContain('Refusing redirected Saga installation directory');
      expect(snapshotTree(outsideDirectory)).toEqual(outsideBefore);
    }

    const subjectProject = path.join(temporaryRoot, 'Query Subject');
    const referenceProject = path.join(temporaryRoot, 'Query Reference');
    const subjectSagaRoot = path.join(subjectProject, '.hagicode/sagas');
    const referenceSagaRoot = path.join(referenceProject, '.hagicode/sagas');
    for (const sagaRoot of [subjectSagaRoot, referenceSagaRoot]) {
      mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
      mkdirSync(path.join(sagaRoot, 'archive', '2026-01-01-archived'), { recursive: true });
      mkdirSync(path.join(sagaRoot, 'prompts'));
      writeProjectFile(sagaRoot, 'demo/goal.md', 'Goal\n');
      writeProjectFile(sagaRoot, 'demo/research.md', 'Research\n');
      writeProjectFile(sagaRoot, 'demo/acceptance.md', '## pending\ncmd: npm test\n## done\ncmd: echo done\n');
      writeProjectFile(sagaRoot, 'demo/progress.md', '- [ ] pending Build | pending.log\n- [x] done Finish | done.log\n- ~ old Removed |\n');
      writeProjectFile(sagaRoot, 'demo/contract.lock', 'revision: 3\nhashes:\n  goal: a\nacceptance-by-item:\n  pending: b\nitems: pending done old\n');
      writeProjectFile(sagaRoot, 'demo/runtime/blocked.json', '{"pending":"waiting","done":"done wins"}');
      writeProjectFile(sagaRoot, 'demo/amendments/001-open.md', 'merged-in:\n');
      writeProjectFile(sagaRoot, 'demo/amendments/002-merged.md', 'merged-in: r3\n');
    }
    writeProjectFile(subjectSagaRoot, 'demo/runtime/status.json', '{"state":"paused","note":"stale","updatedAt":"2000-01-01T00:00:00Z"}');
    const subjectBefore = snapshotTree(subjectProject);
    const packagedJson = (command: string, ...args: string[]) => {
      const result = invoke('saga', command, ...args, '--path', subjectProject, '--json');
      expect(result.code, result.stderr).toBe(0);
      return JSON.parse(result.stdout);
    };

    expect(packagedJson('list').sagas.map((row: { sagaId: string }) => row.sagaId)).toEqual(['demo']);
    expect(packagedJson('items', 'demo').items.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining(['pending', 'done']),
    );
    expect(packagedJson('status', 'demo')).toMatchObject({ sagaId: 'demo' });
    expect(snapshotTree(subjectProject)).toEqual(subjectBefore);
  }, 120_000);
});

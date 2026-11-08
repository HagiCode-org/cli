import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { execFile } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliOperationFailedError, CliUsageError } from '../../../src/runtime/errors';
import {
  createSagaNatively,
  requireSagaResources,
  validateSagaId,
} from '../../../src/runtime/saga/create';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';
import { installSagaResources } from '../../../src/runtime/saga/install';

const run = promisify(execFile);

/** The layout `init` creates: the Saga directory and its runtime ignore rule. No method prompts. */
function installFixtureLayout(sagaRoot: string, ignoreContent = '*/runtime/\n'): void {
  mkdirSync(sagaRoot, { recursive: true });
  writeFileSync(path.join(sagaRoot, '.gitignore'), ignoreContent);
}

function snapshot(root: string): Array<[string, string]> {
  const files: Array<[string, string]> = [];
  function visit(directory: string, prefix = ''): void {
    for (const entry of readdirSync(path.join(directory, prefix), { withFileTypes: true })) {
      const relativePath = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) {
        visit(directory, relativePath);
      } else {
        files.push([relativePath, readFileSync(path.join(directory, relativePath)).toString('base64')]);
      }
    }
  }
  visit(root);
  return files.sort(([left], [right]) => left.localeCompare(right));
}

describe('Saga ID validation', () => {
  let temporaryRoot: string;
  let projectPath: string;
  let sagaRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-create-'));
    projectPath = path.join(temporaryRoot, 'Project With Spaces');
    mkdirSync(projectPath);
    sagaRoot = path.join(projectPath, '.hagicode', 'sagas');
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('accepts one-character IDs and the 63-character limit without creating files', () => {
    for (const id of ['a', '9', 'x'.repeat(63)]) {
      expect(() => validateSagaId(id, sagaRoot)).not.toThrow();
    }
    expect(existsSync(sagaRoot)).toBe(false);
  });

  it('rejects invalid raw IDs and every reserved name before creating anything', () => {
    const invalidIds = [
      '',
      'Uppercase',
      'has space',
      'x'.repeat(64),
      'has/slash',
      'has\\separator',
      '-leading-hyphen',
      'prompts',
      'tools',
      'archive',
      'runtime',
      'amendments',
      'revisions',
    ];

    for (const id of invalidIds) {
      expect(() => validateSagaId(id, sagaRoot)).toThrow(CliUsageError);
    }
    expect(existsSync(sagaRoot)).toBe(false);
  });

  it('rejects existing active paths and archived suffixes without altering them', () => {
    mkdirSync(sagaRoot, { recursive: true });
    const activePath = path.join(sagaRoot, 'active');
    writeFileSync(activePath, 'keep active');
    const archivePath = path.join(sagaRoot, 'archive');
    const archivedSagaPath = path.join(archivePath, '2025-03-01-archived');
    mkdirSync(archivedSagaPath, { recursive: true });
    const sentinel = path.join(archivedSagaPath, 'saga.json');
    writeFileSync(sentinel, 'keep archived');

    expect(() => validateSagaId('active', sagaRoot)).toThrow(CliOperationFailedError);
    expect(() => validateSagaId('archived', sagaRoot)).toThrow(CliOperationFailedError);
    expect(readFileSync(activePath, 'utf8')).toBe('keep active');
    expect(readFileSync(sentinel, 'utf8')).toBe('keep archived');
  });

  it.each([
    ['the ignore file', (sagaRoot: string) => rmSync(path.join(sagaRoot, '.gitignore'))],
    ['the runtime rule', (sagaRoot: string) => writeFileSync(path.join(sagaRoot, '.gitignore'), '# custom ignore\r\n')],
    ['the Saga directory', (sagaRoot: string) => rmSync(sagaRoot, { recursive: true, force: true })],
  ])('refuses an incomplete installation missing %s without writing', (_label, damage) => {
    installFixtureLayout(sagaRoot);
    damage(sagaRoot);
    const selector = { kind: 'path', value: projectPath } as const;
    const before = snapshot(path.join(projectPath, '.hagicode'));

    expect(() => requireSagaResources(sagaRoot, selector)).toThrow(
      `hagi saga init --path "${projectPath}"`,
    );
    expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
  });

  it('accepts a complete customized layout without prompts and without repairing its files', () => {
    installFixtureLayout(sagaRoot, '# custom\r\n*/runtime/\r\n');
    const before = snapshot(path.join(projectPath, '.hagicode'));

    expect(requireSagaResources(sagaRoot, { kind: 'project-id', value: 'project id' })).toBeUndefined();
    expect(existsSync(path.join(sagaRoot, 'prompts'))).toBe(false);
    expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
  });

  it('ignores a legacy prompts directory entirely, even one with differing or unreadable content', () => {
    installFixtureLayout(sagaRoot);
    const legacyPrompt = path.join(sagaRoot, 'prompts', 'run.md');
    mkdirSync(path.dirname(legacyPrompt));
    writeFileSync(legacyPrompt, 'custom run');
    const before = snapshot(path.join(projectPath, '.hagicode'));

    expect(() => requireSagaResources(sagaRoot, { kind: 'path', value: projectPath })).not.toThrow();
    expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
  });

  it('refuses a nonregular ignore file and preserves the original project-id selector in guidance', () => {
    installFixtureLayout(sagaRoot);
    const ignorePath = path.join(sagaRoot, '.gitignore');
    rmSync(ignorePath);
    mkdirSync(ignorePath);
    const before = snapshot(path.join(projectPath, '.hagicode'));

    expect(() => requireSagaResources(sagaRoot, { kind: 'project-id', value: 'project-1' })).toThrow(
      'hagi saga init --project-id "project-1"',
    );
    expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
  });

  it('creates canonical metadata natively with no runtime file, no prompts and no installed tool', () => {
    const report = installSagaResources(projectPath, loadSagaAssets());
    expect(existsSync(path.join(report.root, 'tools'))).toBe(false);
    expect(existsSync(path.join(report.root, 'prompts'))).toBe(false);

    const metadata = createSagaNatively('demo', report.root);

    expect(metadata.id).toBe('demo');
    expect(metadata.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(metadata.method).toBe(1);
    expect(JSON.parse(readFileSync(path.join(report.root, 'demo', 'saga.json'), 'utf8'))).toEqual(metadata);
    expect(existsSync(path.join(report.root, 'demo', 'runtime'))).toBe(false);
  });

  it('lets exactly one of many concurrent processes create the same Saga ID', async () => {
    installSagaResources(projectPath, loadSagaAssets());
    const workerPath = path.join(__dirname, 'fixtures', 'create-worker.ts');
    const results = await Promise.all(Array.from({ length: 5 }, () =>
      run(process.execPath, ['--import', 'tsx', workerPath, sagaRoot, 'race'], {
        cwd: path.resolve(__dirname, '..', '..', '..'),
      }).then(() => 0, (error: { code: number }) => error.code),
    ));

    expect(results.filter(code => code === 0)).toHaveLength(1);
    expect(results.filter(code => code === 1)).toHaveLength(4);
    expect(JSON.parse(readFileSync(path.join(sagaRoot, 'race', 'saga.json'), 'utf8')).id).toBe('race');
  }, 120_000);

  it('refuses a collision and leaves the existing Saga unchanged', () => {
    installSagaResources(projectPath, loadSagaAssets());
    createSagaNatively('demo', sagaRoot);
    const before = readFileSync(path.join(sagaRoot, 'demo', 'saga.json'), 'utf8');

    expect(() => createSagaNatively('demo', sagaRoot)).toThrow('already exists');
    expect(readFileSync(path.join(sagaRoot, 'demo', 'saga.json'), 'utf8')).toBe(before);
  });
});

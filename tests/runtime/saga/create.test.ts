import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliOperationFailedError, CliUsageError } from '../../../src/runtime/errors';
import {
  createSagaWithCanonicalTool,
  requireSagaResources,
  validateSagaId,
} from '../../../src/runtime/saga/create';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';
import { installSagaResources } from '../../../src/runtime/saga/install';

const promptPaths = ['goal', 'research', 'acceptance', 'plan', 'amend', 'run']
  .map(name => `prompts/${name}.md`);

function installFixtureLayout(sagaRoot: string, ignoreContent = '*/runtime/\n'): void {
  for (const relativePath of [...promptPaths, 'tools/saga.mjs', '.gitignore']) {
    const target = path.join(sagaRoot, ...relativePath.split('/'));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, relativePath === '.gitignore' ? ignoreContent : `custom:${relativePath}`);
  }
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

  it.each([...promptPaths, 'tools/saga.mjs', '.gitignore (runtime ignore rule)'])(
    'refuses an incomplete installation missing %s without writing',
    missingPath => {
      installFixtureLayout(sagaRoot);
      const selector = { kind: 'path', value: projectPath } as const;
      if (missingPath === '.gitignore (runtime ignore rule)') {
        writeFileSync(path.join(sagaRoot, '.gitignore'), '# custom ignore\r\n');
      } else {
        rmSync(path.join(sagaRoot, ...missingPath.split('/')));
      }
      const before = snapshot(path.join(projectPath, '.hagicode'));

      expect(() => requireSagaResources(sagaRoot, selector)).toThrow(
        `hagi saga init --path "${projectPath}"`,
      );
      expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
    },
  );

  it('accepts a complete customized layout without repairing its files', () => {
    installFixtureLayout(sagaRoot, '# custom\r\n*/runtime/\r\n');
    const before = snapshot(path.join(projectPath, '.hagicode'));
    expect(requireSagaResources(sagaRoot, { kind: 'project-id', value: 'project id' })).toBe(
      path.join(sagaRoot, 'tools', 'saga.mjs'),
    );
    expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
  });

  it('refuses a nonregular tool and preserves the original project-id selector in guidance', () => {
    installFixtureLayout(sagaRoot);
    const toolPath = path.join(sagaRoot, 'tools', 'saga.mjs');
    rmSync(toolPath);
    mkdirSync(toolPath);
    const before = snapshot(path.join(projectPath, '.hagicode'));

    expect(() => requireSagaResources(sagaRoot, { kind: 'project-id', value: 'project-1' })).toThrow(
      'hagi saga init --project-id "project-1"',
    );
    expect(snapshot(path.join(projectPath, '.hagicode'))).toEqual(before);
  });

  it('creates canonical metadata and runs instructions with an isolated Saga root', () => {
    const report = installSagaResources(projectPath, loadSagaAssets());
    const toolPath = requireSagaResources(report.root, { kind: 'path', value: projectPath });
    const unrelatedRoot = path.join(temporaryRoot, 'unrelated Saga root');
    const metadata = createSagaWithCanonicalTool(
      'demo',
      projectPath,
      report.root,
      toolPath,
      { ...process.env, SAGA_ROOT: unrelatedRoot },
    );

    expect(metadata.id).toBe('demo');
    expect(metadata.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(metadata.method).toBe(1);
    expect(JSON.parse(readFileSync(path.join(report.root, 'demo', 'saga.json'), 'utf8'))).toEqual(metadata);
    expect(existsSync(path.join(unrelatedRoot, 'demo'))).toBe(false);

    const instructions = spawnSync(
      process.execPath,
      [toolPath, '--root', report.root, 'instructions', 'demo', 'goal'],
      {
        cwd: projectPath,
        env: { ...process.env, SAGA_ROOT: unrelatedRoot },
        encoding: 'utf8',
        shell: false,
      },
    );
    expect(instructions.status).toBe(0);
    expect(instructions.stdout).toBe(`${readFileSync(path.join(report.root, 'prompts', 'goal.md'), 'utf8')}\n`);
    expect(existsSync(unrelatedRoot)).toBe(false);
  });

  it('surfaces actionable failures from the installed tool', () => {
    installFixtureLayout(sagaRoot);
    const toolPath = path.join(sagaRoot, 'tools', 'saga.mjs');
    writeFileSync(toolPath, "console.error('child failure detail'); process.exitCode = 7;\n");

    expect(() => createSagaWithCanonicalTool(
      'demo',
      projectPath,
      sagaRoot,
      toolPath,
      process.env,
    )).toThrow('child failure detail');
    expect(existsSync(path.join(sagaRoot, 'demo'))).toBe(false);
  });
});

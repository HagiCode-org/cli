import { chmodSync, lstatSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';
import { installSagaResources } from '../../../src/runtime/saga/install';

const assets = loadSagaAssets();

function listFiles(directory: string, prefix = ''): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(directory, relativePath) : [relativePath];
  });
}

function resourceSnapshot(root: string) {
  return Object.fromEntries(
    listFiles(root).map(relativePath => {
      const target = path.join(root, relativePath);
      const stat = statSync(target);
      return [relativePath, {
        bytes: readFileSync(target).toString('base64'),
        mode: stat.mode,
        mtimeMs: stat.mtimeMs,
      }];
    }),
  );
}

describe('Saga resource installation', () => {
  let temporaryRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-install-'));
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('installs only the runtime ignore rule and never creates a prompts directory', () => {
    const projectRoot = path.join(temporaryRoot, 'empty project');
    mkdirSync(projectRoot);

    const first = installSagaResources(projectRoot, assets);
    expect(first.files).toEqual([{ path: '.gitignore', outcome: 'created' }]);
    expect(first.conflicts).toEqual([]);
    expect(listFiles(first.root).sort()).toEqual(['.gitignore']);
    expect(readFileSync(path.join(first.root, '.gitignore')).equals(assets.install.get('.gitignore')!)).toBe(true);
    expect(statSync(path.join(first.root, 'prompts'), { throwIfNoEntry: false })).toBeUndefined();

    const snapshot = resourceSnapshot(first.root);
    const second = installSagaResources(projectRoot, assets);
    expect(second.files).toEqual([{ path: '.gitignore', outcome: 'unchanged' }]);
    expect(resourceSnapshot(second.root)).toEqual(snapshot);
    expect(listFiles(second.root).some(file => file.endsWith('.tmp'))).toBe(false);
  });

  it('preserves existing contracts, metadata, runtime records, and unrelated Saga files', () => {
    const projectRoot = path.join(temporaryRoot, 'existing project');
    const sagaRoot = path.join(projectRoot, '.hagicode/sagas');
    const preservedFiles = [
      '.hagicode/metadata.json',
      '.hagicode/sagas/demo/progress.md',
      '.hagicode/sagas/demo/saga.json',
      '.hagicode/sagas/demo/runtime/status.json',
    ];
    for (const relativePath of preservedFiles) {
      const target = path.join(projectRoot, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, `preserve:${relativePath}`);
    }
    const before = Object.fromEntries(
      preservedFiles.map(relativePath => {
        const target = path.join(projectRoot, relativePath);
        const stat = statSync(target);
        return [relativePath, { bytes: readFileSync(target, 'utf8'), mode: stat.mode, mtimeMs: stat.mtimeMs }];
      }),
    );

    installSagaResources(projectRoot, assets);

    for (const relativePath of preservedFiles) {
      const target = path.join(projectRoot, relativePath);
      const stat = statSync(target);
      expect({
        bytes: readFileSync(target, 'utf8'),
        mode: stat.mode,
        mtimeMs: stat.mtimeMs,
      }).toEqual(before[relativePath]);
    }
    expect(listFiles(sagaRoot)).toContain('demo/progress.md');
  });

  it.each([false, true])('leaves differing and identical legacy prompts untouched (force=%s)', force => {
    const projectRoot = path.join(temporaryRoot, `legacy-files-${force}`);
    const promptsRoot = path.join(projectRoot, '.hagicode', 'sagas', 'prompts');
    mkdirSync(promptsRoot, { recursive: true });
    writeFileSync(path.join(promptsRoot, 'goal.md'), 'custom goal');
    writeFileSync(path.join(promptsRoot, 'run.md'), readFileSync(path.join(assets.directory, 'prompts', 'run.md')));
    const before = resourceSnapshot(promptsRoot);

    const report = installSagaResources(projectRoot, assets, force);

    expect(report.conflicts).toEqual([]);
    expect(report.files).toEqual([{ path: '.gitignore', outcome: 'created' }]);
    expect(JSON.stringify(report)).not.toContain('prompts');
    expect(resourceSnapshot(promptsRoot)).toEqual(before);
    expect(readFileSync(path.join(promptsRoot, 'goal.md'), 'utf8')).toBe('custom goal');
    expect(listFiles(report.root).some(file => file.startsWith('prompts/'))).toBe(true);
  });

  it.each([false, true])('neither follows nor reports a symlinked legacy prompts directory (force=%s)', force => {
    const projectRoot = path.join(temporaryRoot, `legacy-link-${force}`);
    const sagaRoot = path.join(projectRoot, '.hagicode', 'sagas');
    mkdirSync(sagaRoot, { recursive: true });
    const outside = path.join(temporaryRoot, `outside-${force}`);
    mkdirSync(outside);
    writeFileSync(path.join(outside, 'goal.md'), 'outside');
    symlinkSync(outside, path.join(sagaRoot, 'prompts'), 'dir');
    const before = resourceSnapshot(outside);

    const report = installSagaResources(projectRoot, assets, force);

    expect(report.conflicts).toEqual([]);
    expect(report.files).toEqual([{ path: '.gitignore', outcome: 'created' }]);
    expect(lstatSync(path.join(sagaRoot, 'prompts')).isSymbolicLink()).toBe(true);
    expect(resourceSnapshot(outside)).toEqual(before);
    expect(readFileSync(path.join(report.root, '.gitignore'), 'utf8')).toBe('**/runtime/\n');
  });

  it('writes the recursive runtime ignore rule on a fresh installation', () => {
    const projectRoot = path.join(temporaryRoot, 'fresh ignore project');
    mkdirSync(projectRoot);
    const report = installSagaResources(projectRoot, assets);
    expect(readFileSync(path.join(report.root, '.gitignore'), 'utf8')).toBe('**/runtime/\n');
  });

  it('merges the runtime ignore rule without changing existing lines or file mode', () => {
    const projectRoot = path.join(temporaryRoot, 'ignore project');
    const sagaRoot = path.join(projectRoot, '.hagicode', 'sagas');
    const ignorePath = path.join(sagaRoot, '.gitignore');
    mkdirSync(sagaRoot, { recursive: true });
    const existingBytes = Buffer.from('# keep\r\nnode_modules/ */runtime/');
    writeFileSync(ignorePath, existingBytes);
    chmodSync(ignorePath, 0o640);

    const merged = installSagaResources(projectRoot, assets);
    expect(merged.files.find(file => file.path === '.gitignore')?.outcome).toBe('merged');
    expect(readFileSync(ignorePath)).toEqual(Buffer.from('# keep\r\nnode_modules/ */runtime/\r\n**/runtime/'));
    expect(statSync(ignorePath).mode & 0o777).toBe(0o640);
    const mergedStat = statSync(ignorePath);

    const repeated = installSagaResources(projectRoot, assets, true);
    expect(repeated.files.find(file => file.path === '.gitignore')?.outcome).toBe('unchanged');
    expect(statSync(ignorePath).mtimeMs).toBe(mergedStat.mtimeMs);
    expect(statSync(ignorePath).mode & 0o777).toBe(0o640);
  });
});

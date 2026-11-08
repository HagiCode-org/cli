import { chmodSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
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

  it('installs only managed resources and leaves identical resources untouched on repeat runs', () => {
    const projectRoot = path.join(temporaryRoot, 'empty project');
    mkdirSync(projectRoot);

    const first = installSagaResources(projectRoot, assets);
    expect(first.files.map(file => file.outcome)).toEqual(Array(assets.files.size).fill('created'));
    expect(first.conflicts).toEqual([]);
    expect(listFiles(first.root).sort()).toEqual([...assets.files.keys()].sort());
    for (const [assetPath, bytes] of assets.files) {
      expect(readFileSync(path.join(first.root, ...assetPath.split('/'))).equals(bytes)).toBe(true);
    }

    const snapshot = resourceSnapshot(first.root);
    const second = installSagaResources(projectRoot, assets);
    expect(second.files.map(file => file.outcome)).toEqual(Array(assets.files.size).fill('unchanged'));
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

  it('preserves conflicts by default and restores only differing resources with force', () => {
    const projectRoot = path.join(temporaryRoot, 'conflicting project');
    mkdirSync(projectRoot);
    const initial = installSagaResources(projectRoot, assets);
    const conflictPath = path.join(initial.root, 'prompts/goal.md');
    const missingPath = path.join(initial.root, 'prompts/research.md');
    const unchangedPath = path.join(initial.root, 'prompts/acceptance.md');
    writeFileSync(conflictPath, 'custom prompt');
    rmSync(missingPath);
    const conflictBefore = statSync(conflictPath);
    const unchangedBefore = statSync(unchangedPath);

    const preserved = installSagaResources(projectRoot, assets);
    expect(preserved.conflicts).toEqual(['prompts/goal.md']);
    expect(preserved.files.find(file => file.path === 'prompts/goal.md')?.outcome).toBe('conflict');
    expect(preserved.files.find(file => file.path === 'prompts/research.md')?.outcome).toBe('created');
    expect(readFileSync(conflictPath, 'utf8')).toBe('custom prompt');
    expect(statSync(conflictPath).mtimeMs).toBe(conflictBefore.mtimeMs);

    const forced = installSagaResources(projectRoot, assets, true);
    expect(forced.conflicts).toEqual([]);
    expect(forced.files.find(file => file.path === 'prompts/goal.md')?.outcome).toBe('replaced');
    expect(forced.files.find(file => file.path === 'prompts/acceptance.md')?.outcome).toBe('unchanged');
    expect(readFileSync(conflictPath).equals(assets.files.get('prompts/goal.md')!)).toBe(true);
    expect(statSync(unchangedPath).mtimeMs).toBe(unchangedBefore.mtimeMs);
    expect(statSync(unchangedPath).mode).toBe(unchangedBefore.mode);
    expect(listFiles(initial.root).some(file => file.endsWith('.tmp'))).toBe(false);
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

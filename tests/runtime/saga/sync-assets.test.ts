import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const sourceRoot = fileURLToPath(new URL('../../../../personal-agent-skills/long-running-orchestration/', import.meta.url));
const syncScript = fileURLToPath(new URL('../../../scripts/sync-saga-assets.mjs', import.meta.url));
const assetPaths = [
  '.gitignore',
  'prompts/acceptance.md',
  'prompts/amend.md',
  'prompts/goal.md',
  'prompts/plan.md',
  'prompts/research.md',
  'prompts/run.md',
  'tools/saga.mjs',
];

function snapshotTree(root: string): string {
  const entries: unknown[] = [];

  function visit(current: string, relativePath: string): void {
    const stat = statSync(current);
    entries.push([relativePath, stat.mode, stat.mtimeMs, stat.isDirectory() ? null : readFileSync(current).toString('base64')]);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(current).sort()) {
        visit(path.join(current, entry), path.posix.join(relativePath, entry));
      }
    }
  }

  visit(root, '');
  return JSON.stringify(entries);
}

describe('Saga asset synchronization', () => {
  let temporaryRoot: string;
  let skillDirectory: string;
  let bundleDirectory: string;
  let scriptPath: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-sync-'));
    skillDirectory = path.join(temporaryRoot, 'skill');
    bundleDirectory = path.join(temporaryRoot, 'resources', 'saga');
    scriptPath = path.join(temporaryRoot, 'scripts', 'sync-saga-assets.mjs');
    cpSync(sourceRoot, skillDirectory, { recursive: true });
    mkdirSync(path.dirname(scriptPath), { recursive: true });
    copyFileSync(syncScript, scriptPath);
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  function run(args: string[] = []) {
    return spawnSync(process.execPath, [scriptPath, '--skill', skillDirectory, ...args], {
      cwd: temporaryRoot,
      encoding: 'utf8',
    });
  }

  it('writes a sorted SHA-256 manifest and leaves identical assets untouched', () => {
    const sourceBefore = snapshotTree(skillDirectory);
    expect(run().status).toBe(0);

    const manifest = JSON.parse(readFileSync(path.join(bundleDirectory, 'manifest.json'), 'utf8'));
    expect(manifest.schemaVersion).toBe(1);
    expect(Object.keys(manifest.files)).toEqual(assetPaths);
    for (const assetPath of assetPaths) {
      const bytes = readFileSync(path.join(bundleDirectory, assetPath));
      expect(manifest.files[assetPath]).toBe(createHash('sha256').update(bytes).digest('hex'));
    }

    const bundleBeforeCheck = snapshotTree(bundleDirectory);
    expect(run(['--check']).status).toBe(0);
    expect(snapshotTree(skillDirectory)).toBe(sourceBefore);
    expect(snapshotTree(bundleDirectory)).toBe(bundleBeforeCheck);

    expect(run().status).toBe(0);
    expect(snapshotTree(skillDirectory)).toBe(sourceBefore);
    expect(snapshotTree(bundleDirectory)).toBe(bundleBeforeCheck);
  });

  it('reports missing, differing, unexpected, and incorrectly hashed assets without writing', () => {
    expect(run().status).toBe(0);
    rmSync(path.join(bundleDirectory, 'prompts/goal.md'));
    writeFileSync(path.join(bundleDirectory, 'prompts/run.md'), 'changed');
    writeFileSync(path.join(bundleDirectory, 'unexpected.txt'), 'unexpected');
    const manifestPath = path.join(bundleDirectory, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.files['.gitignore'] = '0'.repeat(64);
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    const sourceBefore = snapshotTree(skillDirectory);
    const bundleBefore = snapshotTree(bundleDirectory);
    const result = run(['--check']);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('missing asset: prompts/goal.md');
    expect(result.stderr).toContain('asset differs from source: prompts/run.md');
    expect(result.stderr).toContain('unexpected asset: unexpected.txt');
    expect(result.stderr).toContain('incorrect manifest hash for .gitignore');
    expect(snapshotTree(skillDirectory)).toBe(sourceBefore);
    expect(snapshotTree(bundleDirectory)).toBe(bundleBefore);
  });
});

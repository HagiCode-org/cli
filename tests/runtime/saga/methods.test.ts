import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliOperationFailedError } from '../../../src/runtime/errors';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';
import { isMethodName, METHOD_NAMES, methodDigests, readMethod } from '../../../src/runtime/saga/methods';

const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));
const bundledAssets = path.join(packageRoot, 'resources', 'saga');
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('published Saga methods', () => {
  let temporaryRoot: string;
  let moduleUrl: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-methods-'));
    cpSync(bundledAssets, path.join(temporaryRoot, 'resources', 'saga'), { recursive: true });
    moduleUrl = pathToFileURL(path.join(temporaryRoot, 'dist', 'chunks', 'saga-methods.js')).href;
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  function fixtureFile(relativePath: string): string {
    return path.join(temporaryRoot, 'resources', 'saga', ...relativePath.split('/'));
  }

  function rewriteManifest(mutate: (manifest: Record<string, unknown>) => void): void {
    const manifest = JSON.parse(readFileSync(fixtureFile('manifest.json'), 'utf8')) as Record<string, unknown>;
    mutate(manifest);
    writeFileSync(fixtureFile('manifest.json'), JSON.stringify(manifest, null, 2));
  }

  it('names exactly the six methods and recognises only them', () => {
    expect([...METHOD_NAMES]).toEqual(['goal', 'research', 'acceptance', 'plan', 'run', 'amend']);
    for (const name of METHOD_NAMES) {
      expect(isMethodName(name)).toBe(true);
    }
    expect(isMethodName('deploy')).toBe(false);
    expect(isMethodName('prompts/run')).toBe(false);
  });

  it('returns bytes and digests equal to the bundled files for all six names', () => {
    const assets = loadSagaAssets();
    const digests = methodDigests(assets);
    for (const name of METHOD_NAMES) {
      const bytes = readFileSync(path.join(bundledAssets, 'prompts', `${name}.md`));
      const method = readMethod(name, assets);
      expect(method.name).toBe(name);
      expect(method.bytes.equals(bytes)).toBe(true);
      expect(method.sha256).toBe(sha256(bytes));
      expect(digests[name]).toBe(method.sha256);
    }
  });

  it('refuses to return any method when a bundled method file was tampered with', () => {
    writeFileSync(fixtureFile('prompts/run.md'), 'edited run method');

    expect(() => readMethod('goal', loadSagaAssets(moduleUrl))).toThrow(CliOperationFailedError);
    expect(() => loadSagaAssets(moduleUrl)).toThrow(/integrity check failed for prompts\/run\.md/);
  });

  it('fails with a manifest error for schema 1, a missing method key, or an extra key', () => {
    rewriteManifest(manifest => {
      manifest.schemaVersion = 1;
    });
    expect(() => loadSagaAssets(moduleUrl)).toThrow(/Unsupported Saga asset manifest schema/);

    cpSync(bundledAssets, path.join(temporaryRoot, 'resources', 'saga'), { recursive: true });
    rewriteManifest(manifest => {
      delete (manifest.methods as Record<string, string>).amend;
    });
    expect(() => loadSagaAssets(moduleUrl)).toThrow(/methods must list exactly/);

    cpSync(bundledAssets, path.join(temporaryRoot, 'resources', 'saga'), { recursive: true });
    rewriteManifest(manifest => {
      (manifest.methods as Record<string, string>).deploy = '0'.repeat(64);
    });
    expect(() => loadSagaAssets(moduleUrl)).toThrow(CliOperationFailedError);
  });

  it('fails when a bundled method file is missing', () => {
    rmSync(fixtureFile('prompts/plan.md'));
    expect(() => loadSagaAssets(moduleUrl)).toThrow(/Saga asset prompts\/plan\.md/);
  });
});

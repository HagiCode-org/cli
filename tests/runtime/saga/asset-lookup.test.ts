import { cpSync, mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';

const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));
const bundledAssets = path.join(packageRoot, 'resources', 'saga');

describe('Saga asset lookup', () => {
  let temporaryRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-assets-'));
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('finds verified assets from source, packaged entries, and chunks outside the package cwd', () => {
    const previousDirectory = process.cwd();
    process.chdir(temporaryRoot);
    try {
      const modulePaths = [
        path.join(packageRoot, 'src/runtime/saga/assets.ts'),
        path.join(packageRoot, 'dist/cli.js'),
        path.join(packageRoot, 'dist/main.js'),
        path.join(packageRoot, 'dist/chunks/saga-assets.js'),
      ];
      for (const modulePath of modulePaths) {
        const assets = loadSagaAssets(pathToFileURL(modulePath).href);
        expect(assets.directory).toBe(bundledAssets);
        expect(assets.files.size).toBe(8);
      }
    } finally {
      process.chdir(previousDirectory);
    }
  });

  it('fails explicitly when an asset is missing or its bytes do not match the manifest', () => {
    const fixtureDirectory = path.join(temporaryRoot, 'resources', 'saga');
    mkdirSync(path.dirname(fixtureDirectory), { recursive: true });
    cpSync(bundledAssets, fixtureDirectory, { recursive: true });
    const moduleUrl = pathToFileURL(path.join(temporaryRoot, 'dist/chunks/saga-assets.js')).href;
    const goalPath = path.join(fixtureDirectory, 'prompts/goal.md');

    rmSync(goalPath);
    expect(() => loadSagaAssets(moduleUrl)).toThrow(/Saga asset prompts\/goal\.md/);

    writeFileSync(goalPath, 'corrupted');
    expect(() => loadSagaAssets(moduleUrl)).toThrow(/integrity check failed for prompts\/goal\.md/);
  });
});

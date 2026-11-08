import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';
import { preflightSagaInstall } from '../../../src/runtime/saga/install';

const assets = loadSagaAssets();

function snapshot(directory: string): string {
  const stat = statSync(directory);
  return JSON.stringify({
    mode: stat.mode,
    mtimeMs: stat.mtimeMs,
    files: readFileSync(path.join(directory, 'marker.txt')).toString('base64'),
  });
}

describe('Saga installation safety preflight', () => {
  let temporaryRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-install-safety-'));
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('rejects redirected managed directories before touching outside targets, even with force', () => {
    const projectRoot = path.join(temporaryRoot, 'project');
    const outside = path.join(temporaryRoot, 'outside');
    mkdirSync(projectRoot);
    mkdirSync(outside);
    writeFileSync(path.join(outside, 'marker.txt'), 'unchanged');

    for (const relativePath of [
      '.hagicode',
      '.hagicode/sagas',
      '.hagicode/sagas/prompts',
      '.hagicode/sagas/tools',
    ]) {
      const target = path.join(projectRoot, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      symlinkSync(outside, target, process.platform === 'win32' ? 'junction' : 'dir');
      const before = snapshot(outside);
      expect(() => preflightSagaInstall(projectRoot, assets, true)).toThrow(/redirected Saga installation directory/);
      expect(snapshot(outside)).toBe(before);
      rmSync(target, { force: true });
    }
  });

  it('rejects redirected and nonregular managed files before changing external content', () => {
    if (process.platform === 'win32') {
      return;
    }

    const projectRoot = path.join(temporaryRoot, 'project');
    const outside = path.join(temporaryRoot, 'outside');
    const prompts = path.join(projectRoot, '.hagicode/sagas/prompts');
    mkdirSync(prompts, { recursive: true });
    mkdirSync(outside);
    const outsideFile = path.join(outside, 'marker.txt');
    writeFileSync(outsideFile, 'unchanged');
    const before = snapshot(outside);
    symlinkSync(outsideFile, path.join(prompts, 'goal.md'));
    expect(() => preflightSagaInstall(projectRoot, assets, true)).toThrow(/redirected Saga resource/);
    expect(snapshot(outside)).toBe(before);

    rmSync(path.join(prompts, 'goal.md'));
    mkdirSync(path.join(prompts, 'goal.md'));
    expect(() => preflightSagaInstall(projectRoot, assets, true)).toThrow(/not a regular file/);
    expect(snapshot(outside)).toBe(before);
  });

  it('refuses forced replacement of a hard-linked resource', () => {
    const projectRoot = path.join(temporaryRoot, 'project');
    const externalFile = path.join(temporaryRoot, 'external-resource');
    const target = path.join(projectRoot, '.hagicode/sagas/prompts/goal.md');
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(externalFile, 'custom bytes');
    linkSync(externalFile, target);
    const before = `${readFileSync(externalFile).toString('base64')}:${statSync(externalFile).mtimeMs}`;

    expect(() => preflightSagaInstall(projectRoot, assets, true)).toThrow(/hard-linked Saga resource/);
    expect(`${readFileSync(externalFile).toString('base64')}:${statSync(externalFile).mtimeMs}`).toBe(before);
  });
});

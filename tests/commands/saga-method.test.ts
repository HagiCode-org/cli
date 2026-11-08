import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { CliOperationFailedError } from '../../src/runtime/errors';
import { loadSagaAssets } from '../../src/runtime/saga/assets';
import { createDependencies } from './testHelpers';

vi.mock('../../src/runtime/saga/assets', async importOriginal => {
  const actual = await importOriginal<typeof import('../../src/runtime/saga/assets')>();
  return { ...actual, loadSagaAssets: vi.fn(actual.loadSagaAssets) };
});

const bundledPrompts = fileURLToPath(new URL('../../resources/saga/prompts/', import.meta.url));
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

describe('saga method command', () => {
  let temporaryRoot: string;
  let previousDirectory: string;

  beforeEach(() => {
    vi.mocked(loadSagaAssets).mockClear();
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-method-'));
    previousDirectory = process.cwd();
    process.chdir(temporaryRoot);
  });

  function cleanUp(): void {
    process.chdir(previousDirectory);
    rmSync(temporaryRoot, { recursive: true, force: true });
  }

  it('prints the bundled method bytes unchanged in a directory with no Saga files, and writes nothing', async () => {
    try {
      const { dependencies, stdout, stderr, api } = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'method', 'run'], dependencies)).toBe(0);

      expect(stdout.join('')).toBe(readFileSync(path.join(bundledPrompts, 'run.md'), 'utf8'));
      expect(stderr).toEqual([]);
      expect(api.listProjects).not.toHaveBeenCalled();
      expect(readdirSync(temporaryRoot)).toEqual([]);
    } finally {
      cleanUp();
    }
  });

  it('prints one JSON object with the name, digest and content when --json is given', async () => {
    try {
      const { dependencies, stdout } = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'method', 'plan', '--json'], dependencies)).toBe(0);

      const bytes = readFileSync(path.join(bundledPrompts, 'plan.md'));
      const payload = JSON.parse(stdout.join(''));
      expect(Object.keys(payload).sort()).toEqual(['content', 'name', 'sha256']);
      expect(payload).toEqual({ name: 'plan', sha256: sha256(bytes), content: bytes.toString('utf8') });
    } finally {
      cleanUp();
    }
  });

  it('exits 2 for an unknown name, names the six valid methods, and prints nothing to stdout', async () => {
    try {
      const { dependencies, stdout, stderr } = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'method', 'deploy'], dependencies)).toBe(2);

      expect(stdout.join('')).toBe('');
      expect(stderr.join('')).toContain('goal, research, acceptance, plan, run, amend');
      expect(readdirSync(temporaryRoot)).toEqual([]);
    } finally {
      cleanUp();
    }
  });

  it.each([['--path', 'project-directory'], ['--project-id', 'project-1']])('exits 2 when the %s selector is given', async (flag, value) => {
    try {
      const { dependencies, stdout } = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'method', 'goal', flag, value], dependencies)).toBe(2);

      expect(stdout.join('')).toBe('');
      expect(readdirSync(temporaryRoot)).toEqual([]);
    } finally {
      cleanUp();
    }
  });

  it('exits 30 with no content when the bundled package fails its integrity check', async () => {
    try {
      vi.mocked(loadSagaAssets).mockImplementationOnce(() => {
        throw new CliOperationFailedError('Saga asset integrity check failed for prompts/run.md');
      });
      const { dependencies, stdout, stderr } = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', 'method', 'run', '--json'], dependencies)).toBe(30);

      expect(stdout.join('')).toBe('');
      expect(stderr.join('')).toContain('prompts/run.md');
      expect(readdirSync(temporaryRoot)).toEqual([]);
    } finally {
      cleanUp();
    }
  });
});

import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureRuntimeIgnore } from '../../../src/runtime/saga/safeWrite';

// Simulates a concurrent claim that creates `.gitignore` after this process checked it is missing and before this
// process creates it: the hook writes the file, so the real exclusive create then fails with EEXIST.
const race = vi.hoisted(() => ({ beforeCreate: undefined as undefined | ((file: string) => void) }));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    openSync: (file: Parameters<typeof actual.openSync>[0], flags: Parameters<typeof actual.openSync>[1], ...rest: unknown[]) => {
      const hook = race.beforeCreate;
      if (hook && flags === 'wx') {
        race.beforeCreate = undefined;
        hook(String(file));
      }
      return (actual.openSync as (...args: unknown[]) => number)(file, flags, ...rest);
    },
  };
});

let workspace: string;
let sagaRoot: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-ignore-race-')));
  sagaRoot = path.join(workspace, '.hagicode', 'sagas');
  mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
});

afterEach(() => {
  race.beforeCreate = undefined;
  rmSync(workspace, { recursive: true, force: true });
});

describe('ensureRuntimeIgnore under a concurrent create', () => {
  const ignorePath = () => path.join(sagaRoot, '.gitignore');

  it('accepts a rule another claim wrote first instead of failing the claim', () => {
    race.beforeCreate = file => writeFileSync(file, '**/runtime/\n');

    expect(() => ensureRuntimeIgnore(sagaRoot)).not.toThrow();
    expect(readFileSync(ignorePath(), 'utf8')).toBe('**/runtime/\n');
  });

  it('appends the rule after content another claim wrote first, without duplicating it', () => {
    race.beforeCreate = file => writeFileSync(file, 'node_modules/\n');

    expect(() => ensureRuntimeIgnore(sagaRoot)).not.toThrow();
    expect(readFileSync(ignorePath(), 'utf8')).toBe('node_modules/\n**/runtime/\n');
  });
});

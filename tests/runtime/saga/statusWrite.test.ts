import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliSagaRefusalError, CliUsageError } from '../../../src/runtime/errors';
import { freezeContract } from '../../../src/runtime/saga/freeze';
import { blockItem, tickItem } from '../../../src/runtime/saga/mutate';
import { setStatus } from '../../../src/runtime/saga/statusWrite';
import { createPlannedSagaAt, writeProof } from './fixtures/saga-fixture';

const run = promisify(execFile);
const workerPath = path.join(__dirname, 'fixtures', 'status-worker.ts');
let root: string;
let sagaRoot: string;
let directory: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-status-')));
  sagaRoot = path.join(root, '.hagicode', 'sagas');
  directory = createPlannedSagaAt(sagaRoot);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const statusFile = () => path.join(directory, 'runtime', 'status.json');
const readStatus = () => JSON.parse(readFileSync(statusFile(), 'utf8'));

function refusalOf(action: () => unknown): string[] {
  try {
    action();
  } catch (error) {
    if (error instanceof CliSagaRefusalError) {
      return error.reasons;
    }
    throw error;
  }
  throw new Error('expected a refusal');
}

function writeStoredStatus(state: string): string {
  mkdirSync(path.join(directory, 'runtime'), { recursive: true });
  writeFileSync(statusFile(), JSON.stringify({ schema: 'saga-status/2', state }));
  return readFileSync(statusFile(), 'utf8');
}

describe('setStatus', () => {
  it('writes draft, paused and planned without gates it does not need, and running after the plan check', () => {
    expect(setStatus(sagaRoot, 'demo', 'draft', '')).toMatchObject({ schema: 'saga-status/2', state: 'draft' });
    expect(setStatus(sagaRoot, 'demo', 'paused', 'freeze refused')).toMatchObject({ state: 'paused', note: 'freeze refused' });
    expect(readStatus()).toMatchObject({ state: 'paused', note: 'freeze refused', revision: 0 });
    expect(setStatus(sagaRoot, 'demo', 'planned', undefined).state).toBe('planned');
    expect(setStatus(sagaRoot, 'demo', 'running', undefined).state).toBe('running');
    expect(readStatus().counts).toEqual({ total: 2, done: 0, blocked: 0, pending: 2, superseded: 0 });
  });

  it('refuses an invalid state as a usage error and writes no file', () => {
    expect(() => setStatus(sagaRoot, 'demo', 'archived', undefined)).toThrow(CliUsageError);
    expect(() => setStatus(sagaRoot, 'demo', undefined, undefined)).toThrow(CliUsageError);
    expect(existsSync(statusFile())).toBe(false);
  });

  it('refuses running while the plan check fails and leaves the stored snapshot unchanged', () => {
    const stored = writeStoredStatus('paused');
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: true\n');
    expect(refusalOf(() => setStatus(sagaRoot, 'demo', 'running', undefined)))
      .toEqual(['item T2 has no acceptance cmd in acceptance.md']);
    expect(readFileSync(statusFile(), 'utf8')).toBe(stored);
  });

  it('refuses done with each completion failure and leaves the stored snapshot unchanged', () => {
    const stored = writeStoredStatus('paused');
    const expectRefusal = (pattern: RegExp) => {
      expect(refusalOf(() => setStatus(sagaRoot, 'demo', 'done', undefined)).join(' ')).toMatch(pattern);
      expect(readFileSync(statusFile(), 'utf8')).toBe(stored);
    };

    // pending items
    expectRefusal(/remain pending or blocked/);

    // blocked item
    freezeContract(sagaRoot, 'demo');
    blockItem(sagaRoot, 'demo', 'T2', 'waiting');
    expectRefusal(/remain pending or blocked/);

    // ticked item without evidence (progress edited by hand)
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [x] T1 First item | evidence/T1.log\n- [x] T2 Second item | evidence/T2.log\n');
    expectRefusal(/evidence file is missing/);

    // open amendment
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [ ] T1 First item |\n- [ ] T2 Second item |\n');
    mkdirSync(path.join(directory, 'amendments'));
    writeFileSync(path.join(directory, 'amendments', '001-x.md'), 'title: x\ncreated-at: t\nmerged-in:\n---\n');
    expectRefusal(/open amendment 001-x.md/);
    rmSync(path.join(directory, 'amendments'), { recursive: true });

    // stale contract
    writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nChanged after the freeze.\n');
    expectRefusal(/hash mismatch for goal/);
  });

  it('refuses done when no active item exists', () => {
    const stored = writeStoredStatus('paused');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n');
    expect(refusalOf(() => setStatus(sagaRoot, 'demo', 'done', undefined)).join(' ')).toMatch(/no active items/);
    expect(readFileSync(statusFile(), 'utf8')).toBe(stored);
  });

  it('writes done for a verified, frozen and closed contract', () => {
    freezeContract(sagaRoot, 'demo');
    writeProof(directory, 'T1');
    writeProof(directory, 'T2');
    tickItem(sagaRoot, 'demo', 'T1');
    tickItem(sagaRoot, 'demo', 'T2');

    expect(setStatus(sagaRoot, 'demo', 'done', 'all verified')).toMatchObject({ state: 'done', note: 'all verified' });
    expect(readStatus()).toMatchObject({ schema: 'saga-status/2', state: 'done', revision: 1 });
  });
});

describe('status replacement atomicity', () => {
  it('keeps every concurrent reader parse a complete saga-status/2 document with no temporary files left', async () => {
    const workers = [
      ['running', '60'],
      ['paused', '60'],
      ['running', '60'],
    ].map(([state, count]) => run(process.execPath, ['--import', 'tsx', workerPath, sagaRoot, 'demo', state, count], {
      cwd: path.resolve(__dirname, '..', '..', '..'),
    }));

    let finished = false;
    let parses = 0;
    const reader = (async () => {
      while (!finished) {
        if (existsSync(statusFile())) {
          const document = JSON.parse(readFileSync(statusFile(), 'utf8'));
          expect(document.schema).toBe('saga-status/2');
          parses += 1;
        }
        await new Promise(resolve => setImmediate(resolve));
      }
    })();

    await Promise.all(workers);
    finished = true;
    await reader;

    expect(parses).toBeGreaterThan(0);
    expect(readdirSync(path.join(directory, 'runtime')).filter(name => name.endsWith('.tmp'))).toEqual([]);
  }, 120_000);
});

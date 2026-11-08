import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliSagaRefusalError, CliUsageError } from '../../../src/runtime/errors';
import { freezeContract } from '../../../src/runtime/saga/freeze';
import { amendSaga, archiveSaga, blockItem, tickItem } from '../../../src/runtime/saga/mutate';
import { readSagaItemsPayload } from '../../../src/runtime/saga/read';
import { createPlannedSagaAt, snapshotFiles, writeProof } from './fixtures/saga-fixture';

let root: string;
let sagaRoot: string;
let directory: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-mutate-')));
  sagaRoot = path.join(root, '.hagicode', 'sagas');
  directory = createPlannedSagaAt(sagaRoot);
  freezeContract(sagaRoot, 'demo');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const progress = () => readFileSync(path.join(directory, 'progress.md'), 'utf8');

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

describe('tick', () => {
  it('ticks a verified item with its evidence reference and clears its blocker', () => {
    writeProof(directory, 'T1');
    blockItem(sagaRoot, 'demo', 'T1', 'flaky');
    expect(tickItem(sagaRoot, 'demo', 'T1')).toEqual({ itemId: 'T1', evidence: 'evidence/T1.log' });

    expect(progress()).toContain('- [x] T1 First item | evidence/T1.log');
    expect(JSON.parse(readFileSync(path.join(directory, 'runtime', 'blocked.json'), 'utf8'))).toEqual({});
  });

  it('refuses a missing report or a report that is not PASS, and keeps progress.md unchanged', () => {
    const before = progress();
    expect(refusalOf(() => tickItem(sagaRoot, 'demo', 'T1'))).toEqual([expect.stringContaining('no PASS report for T1')]);
    writeProof(directory, 'T1', 'Status: FAIL');
    expect(refusalOf(() => tickItem(sagaRoot, 'demo', 'T1'))).toEqual([expect.stringContaining('no PASS report for T1')]);
    expect(progress()).toBe(before);
  });

  it('refuses a missing evidence file and keeps progress.md unchanged', () => {
    mkdirSync(path.join(directory, 'runtime', 'reports'), { recursive: true });
    writeFileSync(path.join(directory, 'runtime', 'reports', 'T1.md'), 'Status: PASS\n');
    const before = progress();
    expect(refusalOf(() => tickItem(sagaRoot, 'demo', 'T1'))).toEqual([expect.stringContaining('no evidence file for T1')]);
    expect(progress()).toBe(before);
  });

  it('refuses unsafe identifiers before touching any file', () => {
    const before = snapshotFiles(sagaRoot);
    for (const id of ['..', '.', '../T1', 'a/b', 'a\\b', '']) {
      expect(refusalOf(() => tickItem(sagaRoot, 'demo', id))).toEqual([expect.stringContaining('invalid item ID')]);
    }
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });

  it('refuses an unknown item', () => {
    writeProof(directory, 'T9');
    expect(refusalOf(() => tickItem(sagaRoot, 'demo', 'T9'))).toEqual([expect.stringContaining('unknown item T9')]);
  });
});

describe('block', () => {
  it('records a blocker that appears as blocked in items and keeps other entries', () => {
    blockItem(sagaRoot, 'demo', 'T1', 'first');
    blockItem(sagaRoot, 'demo', 'T2', 'tests keep failing');

    const blocked = JSON.parse(readFileSync(path.join(directory, 'runtime', 'blocked.json'), 'utf8'));
    expect(blocked).toEqual({ T1: 'first', T2: 'tests keep failing' });
    expect(readSagaItemsPayload(sagaRoot, 'demo').items.find(item => item.id === 'T2')?.state).toBe('blocked');
  });

  it('refuses an unknown item and writes nothing', () => {
    expect(refusalOf(() => blockItem(sagaRoot, 'demo', 'T7', 'reason'))).toEqual([expect.stringContaining('unknown item T7')]);
    expect(existsSync(path.join(directory, 'runtime', 'blocked.json'))).toBe(false);
  });

  it('rejects an empty reason as a usage error', () => {
    expect(() => blockItem(sagaRoot, 'demo', 'T1', '  ')).toThrow(CliUsageError);
  });

  it('shows the blocker removed once the item is ticked with proof', () => {
    blockItem(sagaRoot, 'demo', 'T2', 'waiting');
    writeProof(directory, 'T2');
    tickItem(sagaRoot, 'demo', 'T2');
    expect(readSagaItemsPayload(sagaRoot, 'demo').items.find(item => item.id === 'T2')?.state).toBe('done');
  });
});

describe('amend', () => {
  it('numbers amendments in order with an open merged-in header', () => {
    expect(amendSaga(sagaRoot, 'demo', 'Add retry', 'Retry twice')).toEqual({ name: '001-add-retry.md', mergedIn: '' });
    expect(amendSaga(sagaRoot, 'demo', 'Second change', 'More')).toEqual({ name: '002-second-change.md', mergedIn: '' });

    const text = readFileSync(path.join(directory, 'amendments', '001-add-retry.md'), 'utf8');
    expect(text).toMatch(/^title: Add retry\ncreated-at: \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ\nmerged-in:\n---\nRetry twice\n$/);
  });

  it('falls back to a fixed slug when the title has no Latin letters', () => {
    expect(amendSaga(sagaRoot, 'demo', '重试', '文本').name).toBe('001-amendment.md');
  });

  it('refuses an empty title as a usage error and creates no file', () => {
    expect(() => amendSaga(sagaRoot, 'demo', '   ', 'text')).toThrow(CliUsageError);
    expect(existsSync(path.join(directory, 'amendments'))).toBe(false);
  });
});

describe('archive', () => {
  function finishPlan() {
    writeProof(directory, 'T1');
    writeProof(directory, 'T2');
    tickItem(sagaRoot, 'demo', 'T1');
    tickItem(sagaRoot, 'demo', 'T2');
  }

  it('moves a finished Saga into the dated archive path', () => {
    finishPlan();
    const { destination } = archiveSaga(sagaRoot, 'demo', false);
    expect(path.basename(destination)).toMatch(/^\d{4}-\d\d-\d\d-demo$/);
    expect(existsSync(path.join(sagaRoot, 'demo'))).toBe(false);
    expect(existsSync(path.join(destination, 'runtime', 'reports', 'T1.md'))).toBe(true);
  });

  it('refuses an unfinished Saga without force and moves nothing', () => {
    const reasons = refusalOf(() => archiveSaga(sagaRoot, 'demo', false));
    expect(reasons).toEqual(expect.arrayContaining(['item T1 is pending', 'item T2 is pending']));
    expect(existsSync(path.join(sagaRoot, 'demo'))).toBe(true);
  });

  it('archives an unfinished Saga with force, but never over an existing destination', () => {
    const { destination } = archiveSaga(sagaRoot, 'demo', true);
    expect(existsSync(destination)).toBe(true);

    createPlannedSagaAt(sagaRoot, 'demo');
    mkdirSync(path.join(sagaRoot, 'archive', path.basename(destination)), { recursive: true });
    expect(refusalOf(() => archiveSaga(sagaRoot, 'demo', true))).toEqual([expect.stringContaining('already exists')]);
    expect(existsSync(path.join(sagaRoot, 'demo', 'progress.md'))).toBe(true);
  });

  it('refuses an archive while an amendment is open', () => {
    finishPlan();
    amendSaga(sagaRoot, 'demo', 'Late change', 'text');
    expect(refusalOf(() => archiveSaga(sagaRoot, 'demo', false))).toEqual([
      expect.stringContaining('open amendment 001-late-change.md'),
      'use --force to archive anyway',
    ]);
    expect(readdirSync(sagaRoot)).toContain('demo');
  });
});

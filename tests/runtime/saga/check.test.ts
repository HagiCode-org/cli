import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkErrors, completionErrors } from '../../../src/runtime/saga/check';
import { freezeContract } from '../../../src/runtime/saga/freeze';
import { createPlannedSagaAt, snapshotFiles, writeProof } from './fixtures/saga-fixture';

let root: string;
let sagaRoot: string;
let directory: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-check-')));
  sagaRoot = path.join(root, '.hagicode', 'sagas');
  directory = createPlannedSagaAt(sagaRoot);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const plan = () => checkErrors(sagaRoot, 'demo', 'plan');
const run = () => checkErrors(sagaRoot, 'demo', 'run');

describe('plan phase', () => {
  it('passes a complete plan with items and acceptance commands matched one to one', () => {
    expect(plan()).toEqual([]);
  });

  it('reports every missing artifact', () => {
    rmSync(path.join(directory, 'research.md'));
    rmSync(path.join(directory, 'goal.md'));
    expect(plan()).toEqual(expect.arrayContaining(['research.md is missing', 'goal.md is missing']));
  });

  it('reports a progress file without active items', () => {
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n');
    expect(plan()).toContain('progress.md has no active items');
  });

  it('reports an item without an acceptance command', () => {
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: true\n');
    expect(plan()).toContain('item T2 has no acceptance cmd in acceptance.md');
  });

  it('reports an orphan acceptance entry that names no active item', () => {
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: true\n\n## T2\ncmd: true\n\n## T9\ncmd: true\n');
    expect(plan()).toContain('acceptance entry T9 is not an active item in progress.md');
  });
});

describe('completion gate', () => {
  it('refuses completion while items are pending and while the contract is not frozen', () => {
    expect(completionErrors(sagaRoot, 'demo')).toEqual([
      'active items remain pending or blocked, or there are no active items',
      'contract.lock missing: run freeze first',
    ]);
  });

  it('accepts completion when every active item is ticked with proof and the contract is frozen', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [x] T1 First item | evidence/T1.log\n- [x] T2 Second item | evidence/T2.log\n');
    writeProof(directory, 'T1');
    writeProof(directory, 'T2');
    expect(completionErrors(sagaRoot, 'demo')).toEqual([]);
  });
});

describe('run phase', () => {
  it('reports a missing contract lock and passes once the contract is frozen', () => {
    expect(run()).toEqual(['contract.lock missing: run freeze first']);
    freezeContract(sagaRoot, 'demo');
    expect(run()).toEqual([]);
  });

  it('reports a changed frozen file as a hash mismatch', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nChanged without an amendment.\n');
    expect(run()).toEqual([expect.stringContaining('hash mismatch for goal')]);
  });

  it('reports an unmerged amendment', () => {
    freezeContract(sagaRoot, 'demo');
    mkdirSync(path.join(directory, 'amendments'));
    writeFileSync(path.join(directory, 'amendments', '001-retry.md'), 'title: Retry\ncreated-at: 2026-01-02T00:00:00Z\nmerged-in:\n---\nRetry twice\n');
    expect(run()).toEqual([expect.stringContaining('open amendment 001-retry.md')]);
  });

  it('reports an undecided research question in both headings and accepts a decided one', () => {
    writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## 待决问题\n- 选择数据库\n');
    expect(run()).toContain('open question not decided by a human: 选择数据库');
    writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## Open questions\n- which store\n');
    expect(run()).toContain('open question not decided by a human: which store');
    writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## Open questions\n- which store [decided: postgres]\n');
    expect(run().filter(error => error.includes('open question'))).toEqual([]);
  });

  it('reports a ticked item without evidence, and without a PASS report', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [x] T1 First item | evidence/T1.log\n- [ ] T2 Second item |\n');
    expect(run()).toContain('item T1 is ticked but evidence file is missing: evidence/T1.log');

    mkdirSync(path.join(directory, 'runtime', 'evidence'), { recursive: true });
    writeFileSync(path.join(directory, 'runtime', 'evidence', 'T1.log'), 'exit 0\n');
    expect(run()).toContain('item T1 is ticked but its PASS report is missing');
  });

  it('accepts a ticked item with evidence and a Chinese PASS report', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [x] T1 First item | evidence/T1.log\n- [ ] T2 Second item |\n');
    writeProof(directory, 'T1', '状态: PASS');
    expect(run()).toEqual([]);
  });

  it('writes nothing while checking', () => {
    freezeContract(sagaRoot, 'demo');
    const before = snapshotFiles(sagaRoot);
    run();
    plan();
    expect(snapshotFiles(sagaRoot)).toEqual(before);
    expect(readFileSync(path.join(directory, 'contract.lock'), 'utf8')).toContain('revision: 1');
  });
});

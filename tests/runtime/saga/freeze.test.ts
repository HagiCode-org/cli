import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliSagaRefusalError } from '../../../src/runtime/errors';
import { parseLock, sha256 } from '../../../src/runtime/saga/contract';
import { freezeContract } from '../../../src/runtime/saga/freeze';
import { createPlannedSagaAt, snapshotFiles, writeProof } from './fixtures/saga-fixture';

let root: string;
let sagaRoot: string;
let directory: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-freeze-')));
  sagaRoot = path.join(root, '.hagicode', 'sagas');
  directory = createPlannedSagaAt(sagaRoot);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const lockFile = () => path.join(directory, 'contract.lock');

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

function merge(amendmentName: string, mergedIn: string) {
  mkdirSync(path.join(directory, 'amendments'), { recursive: true });
  writeFileSync(
    path.join(directory, 'amendments', amendmentName),
    `title: Change\ncreated-at: 2026-01-02T00:00:00Z\nmerged-in: ${mergedIn}\n---\nText\n`,
  );
}

describe('freezeContract refusals', () => {
  it('refuses an undecided question under the Chinese heading and writes no lock', () => {
    writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## 待决问题\n- 选择数据库\n');
    expect(refusalOf(() => freezeContract(sagaRoot, 'demo'))).toEqual(['open question not decided by a human: 选择数据库']);
    expect(existsSync(lockFile())).toBe(false);
  });

  it('refuses an undecided question under the English heading', () => {
    writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## Open questions\n- which store\n');
    expect(refusalOf(() => freezeContract(sagaRoot, 'demo'))).toEqual(['open question not decided by a human: which store']);
  });

  it('refuses an unmerged amendment', () => {
    mkdirSync(path.join(directory, 'amendments'));
    writeFileSync(path.join(directory, 'amendments', '001-retry.md'), 'title: Retry\ncreated-at: t\nmerged-in:\n---\nx\n');
    expect(refusalOf(() => freezeContract(sagaRoot, 'demo'))).toEqual([
      'open amendment 001-retry.md: merge it into the artifacts and set merged-in',
    ]);
    expect(existsSync(lockFile())).toBe(false);
  });

  it('refuses a plan whose acceptance commands do not match the items', () => {
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: true\n');
    expect(refusalOf(() => freezeContract(sagaRoot, 'demo'))).toEqual(['item T2 has no acceptance cmd in acceptance.md']);
  });
});

describe('freezeContract revisions', () => {
  it('writes revision 1 with the hashes, per-item acceptance hashes and item list', () => {
    const outcome = freezeContract(sagaRoot, 'demo');
    expect(outcome).toMatchObject({ revision: 1, unchanged: false, reopened: [], added: ['T1', 'T2'] });

    const text = readFileSync(lockFile(), 'utf8');
    const lock = parseLock(text);
    expect(lock.revision).toBe(1);
    expect(lock.prev).toBe('-');
    expect(lock.hashes.goal).toBe(sha256(readFileSync(path.join(directory, 'goal.md'))));
    expect(lock.acceptanceByItem.T1).toBe(sha256('node -e "process.exit(0)"'));
    expect(lock.items).toEqual(['T1', 'T2']);
  });

  it('leaves the lock bytes intact when the contract is unchanged', () => {
    freezeContract(sagaRoot, 'demo');
    const bytes = readFileSync(lockFile());
    expect(freezeContract(sagaRoot, 'demo')).toMatchObject({ revision: 1, unchanged: true });
    expect(readFileSync(lockFile()).equals(bytes)).toBe(true);
  });

  it('refuses a changed frozen file without a merged amendment and leaves the lock and revisions unchanged', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nSilently changed.\n');
    const before = snapshotFiles(sagaRoot);

    expect(refusalOf(() => freezeContract(sagaRoot, 'demo'))).toEqual([
      'contract changed without an amendment merged into r2: tamper or unrecorded change',
    ]);
    expect(snapshotFiles(sagaRoot)).toEqual(before);
    expect(existsSync(path.join(directory, 'revisions'))).toBe(false);
  });

  it('refuses a merged revision that drops a frozen item without a superseded row', () => {
    freezeContract(sagaRoot, 'demo');
    merge('001-drop.md', 'r2');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [ ] T1 First item |\n');
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: node -e "process.exit(0)"\n');

    expect(refusalOf(() => freezeContract(sagaRoot, 'demo'))).toEqual(['item removed without being marked superseded: T2']);
    expect(parseLock(readFileSync(lockFile(), 'utf8')).revision).toBe(1);
  });

  it('writes revision 2 after a merged amendment, reopening a ticked item and moving its proof to history', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [x] T1 First item | evidence/T1.log\n- [ ] T2 Second item |\n');
    writeProof(directory, 'T1');
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: node -e "process.exit(2)"\n\n## T2\ncmd: node -e "process.exit(0)"\n');
    merge('001-stricter.md', 'r2');

    const outcome = freezeContract(sagaRoot, 'demo');
    expect(outcome).toMatchObject({ revision: 2, previousRevision: 1, reopened: ['T1'], added: [] });

    const lock = parseLock(readFileSync(lockFile(), 'utf8'));
    expect(lock.revision).toBe(2);
    expect(lock.prev).toBe(sha256(readFileSync(path.join(directory, 'revisions', 'r1.lock'))));
    expect(readFileSync(path.join(directory, 'progress.md'), 'utf8')).toContain('- [ ] T1 First item | reopened in r2: acceptance changed');
    expect(existsSync(path.join(directory, 'revisions', 'r1.lock'))).toBe(true);
    expect(existsSync(path.join(directory, 'runtime', 'history', 'r1', 'T1.log'))).toBe(true);
    expect(existsSync(path.join(directory, 'runtime', 'history', 'r1', 'T1.md'))).toBe(true);
    expect(existsSync(path.join(directory, 'runtime', 'evidence', 'T1.log'))).toBe(false);
  });

  it('reports an item added by a revision and keeps an unchanged ticked item ticked', () => {
    freezeContract(sagaRoot, 'demo');
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [x] T1 First item | evidence/T1.log\n- [ ] T2 Second item |\n- [ ] T3 Third item |\n');
    writeFileSync(path.join(directory, 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: node -e "process.exit(0)"\n\n## T2\ncmd: node -e "process.exit(0)"\n\n## T3\ncmd: true\n');
    writeProof(directory, 'T1');
    merge('001-add.md', 'r2');

    const outcome = freezeContract(sagaRoot, 'demo');
    expect(outcome).toMatchObject({ revision: 2, reopened: [], added: ['T3'] });
    expect(readFileSync(path.join(directory, 'progress.md'), 'utf8')).toContain('- [x] T1 First item | evidence/T1.log');
    expect(existsSync(path.join(directory, 'runtime', 'evidence', 'T1.log'))).toBe(true);
  });
});

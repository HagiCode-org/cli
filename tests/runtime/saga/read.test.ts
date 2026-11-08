import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliHttpError, CliOperationFailedError, EXIT_CODES, normalizeCliError } from '../../../src/runtime/errors';
import {
  readSagaAcceptanceCommands,
  readSagaAmendments,
  readSagaArtifacts,
  readSagaBlockedEntries,
  readSagaItems,
  readSagaItemsPayload,
  readSagaList,
  readSagaListPayload,
  readSagaPlanRows,
  readSagaRevision,
  readSagaStatus,
  type SagaStatus,
} from '../../../src/runtime/saga/read';

const progress = [
  '- [ ] pending Create | pending evidence',
  '- [x] done Finish | evidence/done.log',
  '- [ ] blocked Wait | blocked note',
  '- [ ] no-command No acceptance entry |',
  '- ~ old Removed |',
  'not a contract row',
].join('\n') + '\n';
const acceptance = [
  '## pending',
  'cmd: npm test',
  '## done',
  'cmd: echo done',
  '## blocked',
  'cmd: make check',
].join('\n') + '\n';
const lock = [
  'revision: 2',
  'frozen-at: 2026-01-01T00:00:00Z',
  'prev: -',
  'hashes:',
  '  goal: abc',
  'acceptance: def',
  '  plan-items: ghi',
  'acceptance-by-item:',
  '  pending: one',
  'items: pending done blocked old',
  '',
].join('\n');

function writeFile(root: string, relativePath: string, contents: string): void {
  const target = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function createProject(projectRoot: string): string {
  const sagaRoot = path.join(projectRoot, '.hagicode', 'sagas');
  mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
  mkdirSync(path.join(sagaRoot, 'alpha'));
  mkdirSync(path.join(sagaRoot, 'archive', '2026-01-01-archived'), { recursive: true });
  for (const reserved of ['prompts', 'tools', 'runtime', 'amendments', 'revisions']) {
    mkdirSync(path.join(sagaRoot, reserved));
  }
  mkdirSync(path.join(sagaRoot, 'Uppercase'));
  writeFile(sagaRoot, 'demo/goal.md', 'Goal\n');
  writeFile(sagaRoot, 'demo/research.md', ' \n');
  writeFile(sagaRoot, 'demo/acceptance.md', acceptance);
  writeFile(sagaRoot, 'demo/progress.md', progress);
  writeFile(sagaRoot, 'demo/contract.lock', lock);
  writeFile(sagaRoot, 'demo/runtime/blocked.json', JSON.stringify({
    pending: 'pending reason',
    done: 'done must win',
    blocked: 'blocked reason',
  }));
  writeFile(sagaRoot, 'demo/amendments/002-merged.md', 'merged-in: r2\n---\n');
  writeFile(sagaRoot, 'demo/amendments/001-open.md', 'title: open\ncreated-at: now\nmerged-in:\n');
  writeFile(sagaRoot, 'demo/amendments/no-marker.md', 'title: missing marker\n');
  writeFile(sagaRoot, 'not-a-saga', 'ignored');
  return sagaRoot;
}

describe('read-only Saga projections', () => {
  let temporaryRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-read-'));
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('reads canonical plan rows, acceptance commands, blocked entries, artifacts, revisions, and amendments', () => {
    const sagaRoot = createProject(path.join(temporaryRoot, 'project'));
    const sagaDirectory = path.join(sagaRoot, 'demo');

    expect(readSagaPlanRows(sagaDirectory)).toEqual({
      active: [
        { id: 'pending', title: 'Create', done: false, note: 'pending evidence' },
        { id: 'done', title: 'Finish', done: true, note: 'evidence/done.log' },
        { id: 'blocked', title: 'Wait', done: false, note: 'blocked note' },
        { id: 'no-command', title: 'No acceptance entry', done: false, note: '' },
      ],
      superseded: [{ id: 'old', title: 'Removed' }],
    });
    expect(readSagaAcceptanceCommands(sagaDirectory)).toEqual({
      pending: 'npm test',
      done: 'echo done',
      blocked: 'make check',
    });
    expect(readSagaBlockedEntries(sagaDirectory)).toEqual({
      pending: 'pending reason',
      done: 'done must win',
      blocked: 'blocked reason',
    });
    expect(readSagaArtifacts(sagaDirectory)).toEqual({
      goal: true,
      research: false,
      acceptance: true,
      plan: true,
    });
    expect(readSagaRevision(sagaDirectory)).toBe(2);
    expect(readSagaAmendments(sagaDirectory)).toEqual([
      { name: '001-open.md', mergedIn: '' },
      { name: '002-merged.md', mergedIn: 'r2' },
      { name: 'no-marker.md', mergedIn: '' },
    ]);
  });

  it('reports a missing or invalid requested Saga as not found', () => {
    const sagaRoot = path.join(temporaryRoot, '.hagicode', 'sagas');
    expect(() => readSagaItemsPayload(sagaRoot, 'missing')).toThrow('not found');
    expect(() => readSagaItemsPayload(sagaRoot, '../outside')).toThrow('not found');
    let error: unknown;
    try {
      readSagaItemsPayload(sagaRoot, 'missing');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(CliHttpError);
    expect(normalizeCliError(error).exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });

  it('uses empty semantics for absent draft data and keeps the zero-active-item status derivation', () => {
    const sagaDirectory = path.join(temporaryRoot, 'project', '.hagicode', 'sagas', 'empty');
    mkdirSync(sagaDirectory, { recursive: true });
    expect(readSagaItems(sagaDirectory)).toEqual([]);
    expect(readSagaStatus('empty', sagaDirectory)).toMatchObject({
      schema: 'saga-status/2',
      state: 'draft',
      note: '',
      revision: 0,
      nextArtifact: 'goal',
      counts: { total: 0, done: 0, blocked: 0, pending: 0, superseded: 0 },
      items: [],
    });

    writeFile(path.dirname(sagaDirectory), 'empty/contract.lock', [
      'revision: 1',
      'hashes:',
      'acceptance-by-item:',
      'items:',
      '',
    ].join('\n'));
    expect(readSagaStatus('empty', sagaDirectory)).toMatchObject({ state: 'done', counts: { total: 0, done: 0 } });
  });

  it('derives planned and nonempty done states from artifacts and revision', () => {
    const plannedDirectory = path.join(temporaryRoot, 'planned', '.hagicode', 'sagas', 'planned');
    mkdirSync(plannedDirectory, { recursive: true });
    for (const artifact of ['goal.md', 'research.md', 'acceptance.md', 'progress.md']) {
      writeFile(plannedDirectory, artifact, 'complete\n');
    }
    expect(readSagaStatus('planned', plannedDirectory)).toMatchObject({
      state: 'planned',
      revision: 0,
      nextArtifact: null,
    });

    const doneDirectory = path.join(temporaryRoot, 'done', '.hagicode', 'sagas', 'done');
    mkdirSync(doneDirectory, { recursive: true });
    writeFile(doneDirectory, 'goal.md', 'goal\n');
    writeFile(doneDirectory, 'research.md', 'research\n');
    writeFile(doneDirectory, 'acceptance.md', '## item\ncmd: true\n');
    writeFile(doneDirectory, 'progress.md', '- [x] item Finished | evidence/done.log\n');
    writeFile(doneDirectory, 'contract.lock', lock.replace('revision: 2', 'revision: 1'));
    expect(readSagaStatus('done', doneDirectory)).toMatchObject({
      state: 'done',
      revision: 1,
      counts: { total: 1, done: 1, blocked: 0, pending: 0 },
    });
  });

  it('ignores stale paused status cache data and leaves it byte-for-byte unchanged', () => {
    const subjectRoot = createProject(path.join(temporaryRoot, 'stale-subject'));
    const statusPath = path.join(subjectRoot, 'demo', 'runtime', 'status.json');
    const stale = JSON.stringify({
      schema: 'saga-status/2',
      state: 'paused',
      note: 'old execution note',
      updatedAt: '2000-01-01T00:00:00Z',
    });
    writeFile(subjectRoot, 'demo/runtime/status.json', stale);
    const before = statSync(statusPath);

    const actual = readSagaStatus('demo', path.join(subjectRoot, 'demo'));
    expect(actual.note).toBe('');
    expect(actual.state).toBe('running');
    expect(statSync(statusPath)).toMatchObject({ size: before.size, mode: before.mode, mtimeMs: before.mtimeMs });
    expect(readFileSync(statusPath, 'utf8')).toBe(stale);
  });

  it('reports malformed and unreadable existing data with its path', () => {
    const sagaDirectory = path.join(temporaryRoot, 'project', '.hagicode', 'sagas', 'demo');
    mkdirSync(sagaDirectory, { recursive: true });
    writeFile(sagaDirectory, 'runtime/blocked.json', '{invalid');
    expect(() => readSagaBlockedEntries(sagaDirectory)).toThrow(
      new RegExp(path.join(sagaDirectory, 'runtime', 'blocked.json').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );

    writeFile(sagaDirectory, 'runtime/blocked.json', '[]');
    expect(() => readSagaBlockedEntries(sagaDirectory)).toThrow('expected a JSON object');

    writeFile(sagaDirectory, 'contract.lock', 'revision: broken\n');
    expect(() => readSagaRevision(sagaDirectory)).toThrow('malformed contract lock');

    mkdirSync(path.join(sagaDirectory, 'acceptance.md'));
    expect(() => readSagaAcceptanceCommands(sagaDirectory)).toThrow(
      new RegExp(path.join(sagaDirectory, 'acceptance.md').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  });

  it('treats a missing Saga root as an empty list without writing', () => {
    const missingRoot = path.join(temporaryRoot, 'missing');
    expect(readSagaList(missingRoot)).toEqual([]);
    expect(existsSync(missingRoot)).toBe(false);
  });
});

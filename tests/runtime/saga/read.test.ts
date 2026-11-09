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
  SNAPSHOT_STATES,
  type SagaStatus,
} from '../../../src/runtime/saga/read';
import { WRITABLE_STATES } from '../../../src/runtime/saga/statusWrite';

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

function snapshotOf(filePath: string): { contents: string; size: number; mode: number; mtimeMs: number } {
  const stat = statSync(filePath);
  return { contents: readFileSync(filePath, 'utf8'), size: stat.size, mode: stat.mode, mtimeMs: stat.mtimeMs };
}

function makeSagaDirectory(root: string, sagaId: string): string {
  const directory = path.join(root, '.hagicode', 'sagas', sagaId);
  mkdirSync(directory, { recursive: true });
  return directory;
}

function writeDoneSaga(directory: string): void {
  writeFile(directory, 'goal.md', 'goal\n');
  writeFile(directory, 'research.md', 'research\n');
  writeFile(directory, 'acceptance.md', '## item\ncmd: true\n');
  writeFile(directory, 'progress.md', '- [x] item Finished | evidence/done.log\n');
  writeFile(directory, 'contract.lock', lock.replace('revision: 2', 'revision: 1'));
}

function writePlannedSaga(directory: string): void {
  for (const artifact of ['goal.md', 'research.md', 'acceptance.md', 'progress.md']) {
    writeFile(directory, artifact, 'complete\n');
  }
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

  it('reports a stored paused state and note while counts and items come from the Saga files', () => {
    const subjectRoot = createProject(path.join(temporaryRoot, 'paused-subject'));
    const sagaDirectory = path.join(subjectRoot, 'demo');
    const statusPath = path.join(sagaDirectory, 'runtime', 'status.json');
    writeFile(subjectRoot, 'demo/runtime/status.json', JSON.stringify({
      schema: 'saga-status/2',
      state: 'paused',
      note: 'freeze refused',
      updatedAt: '2000-01-01T00:00:00Z',
      counts: { total: 99, done: 99, blocked: 0, pending: 0, superseded: 0 },
      items: [],
    }));
    const before = snapshotOf(statusPath);

    const actual = readSagaStatus('demo', sagaDirectory);
    expect(actual).toMatchObject({
      state: 'paused',
      note: 'freeze refused',
      revision: 2,
      nextArtifact: 'research',
      openAmendments: 2,
      counts: { total: 4, done: 1, blocked: 2, pending: 1, superseded: 1 },
    });
    expect(actual.items.map(item => [item.id, item.state])).toEqual([
      ['pending', 'blocked'],
      ['done', 'done'],
      ['blocked', 'blocked'],
      ['no-command', 'pending'],
      ['old', 'superseded'],
    ]);
    expect(actual.updatedAt).not.toBe('2000-01-01T00:00:00Z');
    expect(snapshotOf(statusPath)).toEqual(before);
  });

  it('lets a stored paused state override a derived done state', () => {
    const directory = makeSagaDirectory(path.join(temporaryRoot, 'paused-over-done'), 'done');
    writeDoneSaga(directory);
    writeFile(directory, 'runtime/status.json', JSON.stringify({ state: 'paused', note: 'hold for review' }));
    const statusPath = path.join(directory, 'runtime', 'status.json');
    const before = snapshotOf(statusPath);

    expect(readSagaStatus('done', directory)).toMatchObject({ state: 'paused', note: 'hold for review' });
    expect(snapshotOf(statusPath)).toEqual(before);
  });

  it('reports a stored done state with its note when the derivation is also done', () => {
    const directory = makeSagaDirectory(path.join(temporaryRoot, 'stored-done'), 'done');
    writeDoneSaga(directory);
    writeFile(directory, 'runtime/status.json', JSON.stringify({ state: 'done', note: 'gate passed' }));
    const statusPath = path.join(directory, 'runtime', 'status.json');
    const before = snapshotOf(statusPath);

    expect(readSagaStatus('done', directory)).toMatchObject({ state: 'done', note: 'gate passed' });
    expect(snapshotOf(statusPath)).toEqual(before);
  });

  it('honors a stored running state with its note when the derivation is also running', () => {
    const subjectRoot = createProject(path.join(temporaryRoot, 'running-subject'));
    const sagaDirectory = path.join(subjectRoot, 'demo');
    const statusPath = path.join(sagaDirectory, 'runtime', 'status.json');
    writeFile(subjectRoot, 'demo/runtime/status.json', JSON.stringify({ state: 'running', note: 'live run' }));
    const before = snapshotOf(statusPath);

    expect(readSagaStatus('demo', sagaDirectory)).toMatchObject({ state: 'running', note: 'live run' });
    expect(snapshotOf(statusPath)).toEqual(before);
  });

  it('falls back to the derivation for a stale running state, with an empty note', () => {
    const doneDirectory = makeSagaDirectory(path.join(temporaryRoot, 'stale-done'), 'done');
    writeDoneSaga(doneDirectory);
    writeFile(doneDirectory, 'runtime/status.json', JSON.stringify({ state: 'running', note: 'dead run' }));
    const donePath = path.join(doneDirectory, 'runtime', 'status.json');
    const doneBefore = snapshotOf(donePath);
    expect(readSagaStatus('done', doneDirectory)).toMatchObject({ state: 'done', note: '' });
    expect(snapshotOf(donePath)).toEqual(doneBefore);

    const plannedDirectory = makeSagaDirectory(path.join(temporaryRoot, 'stale-planned'), 'planned');
    writePlannedSaga(plannedDirectory);
    writeFile(plannedDirectory, 'runtime/status.json', JSON.stringify({ state: 'running', note: 'dead run' }));
    expect(readSagaStatus('planned', plannedDirectory)).toMatchObject({ state: 'planned', note: '' });

    const draftDirectory = makeSagaDirectory(path.join(temporaryRoot, 'stale-draft'), 'draft');
    writeFile(draftDirectory, 'runtime/status.json', JSON.stringify({ state: 'running', note: 'dead run' }));
    expect(readSagaStatus('draft', draftDirectory)).toMatchObject({ state: 'draft', note: '' });
  });

  it('uses the derivation without creating a runtime directory when the snapshot is missing', () => {
    const sagaDirectory = makeSagaDirectory(path.join(temporaryRoot, 'no-snapshot'), 'bare');
    expect(readSagaStatus('bare', sagaDirectory)).toMatchObject({ state: 'draft', note: '' });
    expect(existsSync(path.join(sagaDirectory, 'runtime'))).toBe(false);
  });

  it('uses the derivation for unparsable, non-object and invalid-state snapshots, leaving each unchanged', () => {
    const subjectRoot = createProject(path.join(temporaryRoot, 'invalid-subject'));
    const sagaDirectory = path.join(subjectRoot, 'demo');
    const statusPath = path.join(sagaDirectory, 'runtime', 'status.json');
    for (const contents of [
      '{invalid',
      '[]',
      '"paused"',
      'null',
      JSON.stringify({ state: 'stopped', note: 'not a state' }),
      JSON.stringify({ note: 'no state' }),
    ]) {
      writeFileSync(statusPath, contents);
      const before = snapshotOf(statusPath);
      expect(readSagaStatus('demo', sagaDirectory)).toMatchObject({ state: 'running', note: '' });
      expect(snapshotOf(statusPath)).toEqual(before);
    }
  });

  it('reports a stored paused state in saga list rows', () => {
    const subjectRoot = createProject(path.join(temporaryRoot, 'list-subject'));
    const statusPath = path.join(subjectRoot, 'demo', 'runtime', 'status.json');
    writeFile(subjectRoot, 'demo/runtime/status.json', JSON.stringify({ state: 'paused', note: 'freeze refused' }));
    const before = snapshotOf(statusPath);

    const rows = readSagaList(subjectRoot);
    expect(rows.find(row => row.sagaId === 'demo')).toMatchObject({ state: 'paused' });
    expect(readSagaStatus('demo', path.join(subjectRoot, 'demo'))).toMatchObject({ state: 'paused' });
    expect(snapshotOf(statusPath)).toEqual(before);
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

describe('saga snapshot state vocabulary', () => {
  it('keeps the states read from a stored snapshot equal to the writable states', () => {
    expect([...SNAPSHOT_STATES]).toEqual([...WRITABLE_STATES]);
  });
});

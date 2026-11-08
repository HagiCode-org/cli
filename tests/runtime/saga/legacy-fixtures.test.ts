import { cpSync, mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkErrors } from '../../../src/runtime/saga/check';
import { readSagaRevision, readSagaStatus, readSagaListPayload, readSagaItemsPayload } from '../../../src/runtime/saga/read';

// Saga directories written by the legacy standalone tool (git HEAD, before its removal), with
// its canonical read outputs captured next to them. No tool file is present in the fixture tree.
const LEGACY_TOOL = ['saga', 'mjs'].join('.');

const fixtureRoot = path.join(__dirname, 'fixtures', 'legacy-sagas');
const expectedRoot = path.join(fixtureRoot, 'expected');

function readExpected(name: string): string {
  return readFileSync(path.join(expectedRoot, name), 'utf8');
}

function withoutObservationTime<T extends { updatedAt?: string }>(row: T): Omit<T, 'updatedAt'> {
  const { updatedAt: _ignored, ...rest } = row;
  return rest;
}

describe('legacy-written Saga fixtures', () => {
  let temporaryRoot: string;
  let sagaRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-legacy-fixtures-'));
    sagaRoot = path.join(temporaryRoot, 'project', '.hagicode', 'sagas');
    mkdirSync(sagaRoot, { recursive: true });
    for (const id of ['legacy-running', 'legacy-planned']) {
      cpSync(path.join(fixtureRoot, id), path.join(sagaRoot, id), { recursive: true });
    }
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it('contains no standalone tool file', () => {
    expect(() => readFileSync(path.join(fixtureRoot, 'legacy-running', 'tools', LEGACY_TOOL))).toThrow();
    expect(() => readFileSync(path.join(fixtureRoot, 'tools', LEGACY_TOOL))).toThrow();
  });

  it('lists both fixture Sagas with the canonical list output', () => {
    const expected = JSON.parse(readExpected('list.json')) as { sagas: Array<{ updatedAt?: string }> };
    const actual = readSagaListPayload(sagaRoot);

    expect(actual.sagas.map(withoutObservationTime)).toEqual(expected.sagas.map(withoutObservationTime));
  });

  it('returns the canonical items payload exactly for the frozen Saga', () => {
    const expected = JSON.parse(readExpected('items-legacy-running.json'));
    expect(readSagaItemsPayload(sagaRoot, 'legacy-running')).toEqual(expected);
  });

  it('returns the canonical items payload exactly for the planned Saga', () => {
    const expected = JSON.parse(readExpected('items-legacy-planned.json'));
    expect(readSagaItemsPayload(sagaRoot, 'legacy-planned')).toEqual(expected);
  });

  it('reports the frozen revision recorded in contract.lock', () => {
    expect(readSagaRevision(path.join(sagaRoot, 'legacy-running'))).toBe(Number(readExpected('revision-legacy-running.txt').trim()));
    expect(readSagaRevision(path.join(sagaRoot, 'legacy-planned'))).toBe(0);
  });

  it('reads the legacy runtime status record for the frozen Saga', () => {
    const legacy = JSON.parse(readFileSync(path.join(fixtureRoot, 'legacy-running', 'runtime', 'status.json'), 'utf8'));
    const actual = readSagaStatus('legacy-running', path.join(sagaRoot, 'legacy-running'));

    expect(actual.sagaId).toBe(legacy.sagaId);
    expect(actual.revision).toBe(legacy.revision);
    expect(actual.counts).toEqual(legacy.counts);
    expect(actual.openAmendments).toBe(legacy.openAmendments);
    expect(actual.artifacts).toEqual(legacy.artifacts);
    expect(actual.nextArtifact).toBe(legacy.nextArtifact);
  });

  it.each([
    ['legacy-planned', 'plan'],
    ['legacy-running', 'plan'],
  ] as const)('check --phase %s matches the legacy output for %s', (sagaId, phase) => {
    const expectedName = `check-${phase}-${sagaId}.txt`;
    const expectedLines = readExpected(expectedName).trim().split('\n');
    const actual = checkErrors(sagaRoot, sagaId, phase);

    if (expectedLines[0] === 'CHECK OK (plan)') {
      expect(actual).toEqual([]);
    } else {
      expect(actual).toEqual(expectedLines.map(line => line.replace(/^CHECK FAIL: /, '')));
    }
  });

  it('reports the open amendment that the legacy run-phase check reported', () => {
    const expectedLines = readExpected('check-run-legacy-running.txt').trim().split('\n');
    const actual = checkErrors(sagaRoot, 'legacy-running', 'run');
    expect(actual).toEqual(expectedLines.map(line => line.replace(/^CHECK FAIL: /, '')));
  });
});

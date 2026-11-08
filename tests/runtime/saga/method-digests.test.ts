import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMethodNotices } from '../../../src/formatters/saga';
import { checkRun, methodsReport } from '../../../src/runtime/saga/check';
import { loadContractView } from '../../../src/runtime/saga/check';
import { CliOperationFailedError } from '../../../src/runtime/errors';
import { parseLock, serializeLock, sha256, type ContractLock } from '../../../src/runtime/saga/contract';
import { freezeContract } from '../../../src/runtime/saga/freeze';
import { methodDigests } from '../../../src/runtime/saga/methods';
import { createPlannedSagaAt, snapshotFiles, writeProof } from './fixtures/saga-fixture';

vi.mock('../../../src/runtime/saga/methods', async importOriginal => {
  const actual = await importOriginal<typeof import('../../../src/runtime/saga/methods')>();
  return { ...actual, methodDigests: vi.fn(actual.methodDigests) };
});

const bundledPrompts = fileURLToPath(new URL('../../../resources/saga/prompts/', import.meta.url));
const METHODS = ['goal', 'research', 'acceptance', 'plan', 'run', 'amend'] as const;
const ZERO = '0'.repeat(64);

let root: string;
let sagaRoot: string;
let directory: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-method-digests-')));
  sagaRoot = path.join(root, '.hagicode', 'sagas');
  directory = createPlannedSagaAt(sagaRoot);
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  vi.mocked(methodDigests).mockClear();
});

const lockFile = () => path.join(directory, 'contract.lock');
const readLock = (): ContractLock => parseLock(readFileSync(lockFile(), 'utf8'));
const writeLock = (lock: ContractLock) => writeFileSync(lockFile(), serializeLock(lock));

function merge(amendmentName: string, mergedIn: string) {
  mkdirSync(path.join(directory, 'amendments'), { recursive: true });
  writeFileSync(
    path.join(directory, 'amendments', amendmentName),
    `title: Change\ncreated-at: 2026-01-02T00:00:00Z\nmerged-in: ${mergedIn}\n---\nText\n`,
  );
}

describe('contract.lock methods section', () => {
  const base: ContractLock = {
    revision: 1,
    frozenAt: '2026-01-01T00:00:00Z',
    prev: '-',
    hashes: { goal: ZERO, acceptance: ZERO, 'plan-items': ZERO },
    acceptanceByItem: { T1: ZERO },
    items: ['T1'],
  };
  const methods = Object.fromEntries(METHODS.map(name => [name, sha256(name)]));

  it('round-trips the methods section and places it between acceptance-by-item and items', () => {
    const text = serializeLock({ ...base, methods });
    const order = ['\nacceptance-by-item:', '\nmethods:', '\nitems:'].map(marker => text.indexOf(marker));
    expect(order.every(index => index >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((left, right) => left - right));
    expect(parseLock(text).methods).toEqual(methods);
    expect(serializeLock(parseLock(text))).toBe(text);
  });

  it('keeps a lock without the section byte-identical and parses it with methods undefined', () => {
    const text = serializeLock(base);
    expect(text).not.toContain('methods:');
    expect(parseLock(text).methods).toBeUndefined();
    expect(serializeLock(parseLock(text))).toBe(text);
  });

  it('is ignored by a reader that only looks at the hashes, acceptance and items', () => {
    const plain = parseLock(serializeLock(base));
    const withSection = parseLock(serializeLock({ ...base, methods }));
    expect({ ...withSection, methods: undefined }).toEqual(plain);
  });
});

describe('freeze records method digests', () => {
  it('writes revision 1 with the six published digests in name order', () => {
    freezeContract(sagaRoot, 'demo');

    const expected = Object.fromEntries(METHODS.map(name => [
      name,
      sha256(readFileSync(path.join(bundledPrompts, `${name}.md`))),
    ]));
    expect(Object.keys(readLock().methods ?? {})).toEqual([...METHODS]);
    expect(readLock().methods).toEqual(expected);
  });

  it('moves the previous lock to revisions/rN.lock byte for byte and records current digests in N+1', () => {
    freezeContract(sagaRoot, 'demo');
    // Simulate a lock frozen by an older CLI: its recorded run digest differs from the installed one.
    const older = readLock();
    older.methods = { ...older.methods, run: ZERO };
    writeLock(older);
    const olderBytes = readFileSync(lockFile());

    writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nRevised goal.\n');
    merge('001-goal.md', 'r2');
    expect(freezeContract(sagaRoot, 'demo')).toMatchObject({ revision: 2, previousRevision: 1 });

    expect(readFileSync(path.join(directory, 'revisions', 'r1.lock')).equals(olderBytes)).toBe(true);
    expect(readLock().methods?.run).toBe(methodDigests().run);
  });

  it('leaves an unchanged repeat untouched, including a legacy lock with no methods section', () => {
    freezeContract(sagaRoot, 'demo');
    const lock = readLock();
    writeLock({ ...lock, methods: undefined });
    const legacyBytes = readFileSync(lockFile());
    expect(parseLock(legacyBytes.toString('utf8')).methods).toBeUndefined();

    expect(freezeContract(sagaRoot, 'demo')).toMatchObject({ revision: 1, unchanged: true });
    expect(readFileSync(lockFile()).equals(legacyBytes)).toBe(true);
    expect(existsSync(path.join(directory, 'revisions'))).toBe(false);
  });

  it('writes nothing when the package integrity check fails', () => {
    vi.mocked(methodDigests).mockImplementationOnce(() => {
      throw new CliOperationFailedError('Saga asset integrity check failed for prompts/run.md');
    });
    const before = snapshotFiles(sagaRoot);

    expect(() => freezeContract(sagaRoot, 'demo')).toThrow(CliOperationFailedError);
    expect(existsSync(lockFile())).toBe(false);
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });
});

describe('check reports method drift without failing', () => {
  it('reports no drift for a freshly frozen Saga', () => {
    freezeContract(sagaRoot, 'demo');
    expect(checkRun(sagaRoot, 'demo', 'run')).toEqual({ errors: [], methods: { recorded: true, drift: [] } });
  });

  it('lists a method whose recorded digest differs, and still passes', () => {
    freezeContract(sagaRoot, 'demo');
    const lock = readLock();
    writeLock({ ...lock, methods: { ...lock.methods, run: ZERO } });

    const result = checkRun(sagaRoot, 'demo', 'run');
    expect(result.errors).toEqual([]);
    expect(result.methods).toEqual({
      recorded: true,
      drift: [{ name: 'run', recorded: ZERO, current: methodDigests().run }],
    });
    expect(formatMethodNotices(result.methods)).toBe(
      `notice: method run differs from the digest recorded at freeze (recorded ${ZERO}, installed ${methodDigests().run}); confirm before resuming\n`,
    );
  });

  it('reports recorded false and no drift for a legacy lock', () => {
    freezeContract(sagaRoot, 'demo');
    writeLock({ ...readLock(), methods: undefined });

    expect(checkRun(sagaRoot, 'demo', 'run')).toEqual({ errors: [], methods: { recorded: false, drift: [] } });
    expect(formatMethodNotices({ recorded: false, drift: [] })).toBe('');
  });

  it('omits methods when no lock exists, and the missing-lock error is unchanged', () => {
    expect(checkRun(sagaRoot, 'demo', 'run')).toEqual({ errors: ['contract.lock missing: run freeze first'] });
    expect(methodsReport(loadContractView(sagaRoot, 'demo'))).toBeUndefined();
  });

  it('keeps drift alongside another run error without adding an error for it', () => {
    freezeContract(sagaRoot, 'demo');
    const lock = readLock();
    writeLock({ ...lock, methods: { ...lock.methods, plan: ZERO } });
    writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nSilently changed.\n');

    const result = checkRun(sagaRoot, 'demo', 'run');
    expect(result.errors).toEqual([
      'hash mismatch for goal: frozen contract (r1) changed, run freeze after merging an amendment',
    ]);
    expect(result.methods?.drift.map(entry => entry.name)).toEqual(['plan']);
  });

  it('never reports methods for the plan phase', () => {
    freezeContract(sagaRoot, 'demo');
    expect(checkRun(sagaRoot, 'demo', 'plan')).toEqual({ errors: [] });
  });

  it('writes nothing while reporting drift', () => {
    freezeContract(sagaRoot, 'demo');
    const lock = readLock();
    writeLock({ ...lock, methods: { ...lock.methods, run: ZERO } });
    const before = snapshotFiles(sagaRoot);

    checkRun(sagaRoot, 'demo', 'run');
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });
});

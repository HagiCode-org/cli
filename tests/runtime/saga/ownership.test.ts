import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliSagaRefusalError, CliUsageError } from '../../../src/runtime/errors';
import { assertOwner, claimExecution, releaseExecution, tokensMatch } from '../../../src/runtime/saga/ownership';

const run = promisify(execFile);
const workerPath = path.join(__dirname, 'fixtures', 'claim-worker.ts');

let workspace: string;
let sagaRoot: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-ownership-')));
  sagaRoot = path.join(workspace, '.hagicode', 'sagas');
  mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function lockPath() {
  return path.join(sagaRoot, 'demo', 'runtime', 'execute.lock');
}

function writeStatus(state: string) {
  mkdirSync(path.join(sagaRoot, 'demo', 'runtime'), { recursive: true });
  writeFileSync(path.join(sagaRoot, 'demo', 'runtime', 'status.json'), JSON.stringify({ state }));
}

describe('claimExecution', () => {
  it('creates the lock with the token, owner session and creation time on first claim', () => {
    const owner = claimExecution(sagaRoot, 'demo', 's1');

    expect(owner.ownerSession).toBe('s1');
    expect(owner.token.length).toBeGreaterThan(0);
    expect(JSON.parse(readFileSync(lockPath(), 'utf8'))).toEqual(owner);
    expect(existsSync(path.join(sagaRoot, '.gitignore'))).toBe(true);
  });

  it('requires a nonempty session and creates nothing without one', () => {
    expect(() => claimExecution(sagaRoot, 'demo', '  ')).toThrow(CliUsageError);
    expect(existsSync(path.join(sagaRoot, 'demo', 'runtime'))).toBe(false);
  });

  it('lets exactly one of many concurrent processes claim the same Saga', async () => {
    const attempts = Array.from({ length: 6 }, (_, index) =>
      run(process.execPath, ['--import', 'tsx', workerPath, sagaRoot, 'demo', `session-${index}`], {
        cwd: path.resolve(__dirname, '..', '..', '..'),
      }).then(
        ({ stdout }) => ({ code: 0, body: JSON.parse(stdout) }),
        (error: { code: number; stdout: string }) => ({ code: error.code, body: JSON.parse(error.stdout || '{}') }),
      ),
    );
    const results = await Promise.all(attempts);

    expect(results.filter(result => result.code === 0)).toHaveLength(1);
    expect(results.filter(result => result.code === 1)).toHaveLength(5);
    const winner = results.find(result => result.code === 0)!.body.ownerSession as string;
    expect(JSON.parse(readFileSync(lockPath(), 'utf8')).ownerSession).toBe(winner);
  }, 120_000);

  it('refuses a claim against an old lock and leaves its bytes and modification time unchanged', () => {
    claimExecution(sagaRoot, 'demo', 'original');
    const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 900);
    utimesSync(lockPath(), longAgo, longAgo);
    const bytes = readFileSync(lockPath());
    const mtime = statSync(lockPath()).mtimeMs;

    expect(() => claimExecution(sagaRoot, 'demo', 'takeover')).toThrow(CliSagaRefusalError);
    expect(readFileSync(lockPath()).equals(bytes)).toBe(true);
    expect(statSync(lockPath()).mtimeMs).toBe(mtime);
  });
});

describe('assertOwner', () => {
  it('passes with the holder token and refuses a missing or different token', () => {
    const owner = claimExecution(sagaRoot, 'demo', 's1');

    expect(assertOwner(sagaRoot, 'demo', owner.token)).toEqual({ locked: true, ownerSession: 's1' });
    expect(() => assertOwner(sagaRoot, 'demo', undefined)).toThrow(CliSagaRefusalError);
    expect(() => assertOwner(sagaRoot, 'demo', 'wrong')).toThrow(/owned by session s1/);
  });

  it('passes without a lock regardless of the supplied token', () => {
    expect(assertOwner(sagaRoot, 'demo', undefined)).toEqual({ locked: false });
    expect(assertOwner(sagaRoot, 'demo', 'anything')).toEqual({ locked: false });
  });

  it('compares tokens of any length without treating prefixes as matches', () => {
    expect(tokensMatch('abc', 'abc')).toBe(true);
    expect(tokensMatch('abc', 'ab')).toBe(false);
    expect(tokensMatch('abc', '')).toBe(false);
    expect(tokensMatch('abc', undefined)).toBe(false);
  });
});

describe('releaseExecution', () => {
  it('refuses when there is no lock to release', () => {
    expect(() => releaseExecution(sagaRoot, 'demo', { token: 'x', workersSettled: true })).toThrow(/nothing to release/);
  });

  it('refuses a token mismatch and keeps the lock', () => {
    claimExecution(sagaRoot, 'demo', 's1');
    writeStatus('paused');
    expect(() => releaseExecution(sagaRoot, 'demo', { token: 'wrong', workersSettled: true })).toThrow(CliSagaRefusalError);
    expect(existsSync(lockPath())).toBe(true);
  });

  it('refuses when workers are not confirmed settled and keeps the lock', () => {
    const owner = claimExecution(sagaRoot, 'demo', 's1');
    writeStatus('paused');
    expect(() => releaseExecution(sagaRoot, 'demo', { token: owner.token, workersSettled: false })).toThrow(/workers-settled/);
    expect(existsSync(lockPath())).toBe(true);
  });

  it('refuses while the stored snapshot is running or missing', () => {
    const owner = claimExecution(sagaRoot, 'demo', 's1');
    expect(() => releaseExecution(sagaRoot, 'demo', { token: owner.token, workersSettled: true })).toThrow(/missing/);
    writeStatus('running');
    expect(() => releaseExecution(sagaRoot, 'demo', { token: owner.token, workersSettled: true })).toThrow(/running/);
    expect(existsSync(lockPath())).toBe(true);
  });

  it('removes the lock after a paused snapshot with the holder token and confirmation', () => {
    const owner = claimExecution(sagaRoot, 'demo', 's1');
    writeStatus('paused');

    expect(releaseExecution(sagaRoot, 'demo', { token: owner.token, workersSettled: true })).toEqual({ ownerSession: 's1' });
    expect(existsSync(lockPath())).toBe(false);
  });
});

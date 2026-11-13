import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { loadSagaAssets } from '../../src/runtime/saga/assets';
import { installSagaResources } from '../../src/runtime/saga/install';
import { createPlannedSagaAt, snapshotFiles } from '../runtime/saga/fixtures/saga-fixture';
import { createDependencies } from './testHelpers';

let workspace: string;
let projectPath: string;
let sagaRoot: string;

const MARK_METADATA = { 'saga.id': 'demo', 'saga.role': 'master' };

function sagaDirectory(id = 'demo'): string {
  return path.join(sagaRoot, id);
}

/** Resolves once the mocked call has been made; the mark schedules its timer before it calls the backend. */
async function waitForCall(mock: { mock: { calls: unknown[] } }): Promise<void> {
  while (mock.mock.calls.length === 0) {
    await new Promise(resolve => setImmediate(resolve));
  }
}

/** Runs `hagi saga ...` against a fresh harness; `env` is added to the harness environment. */
async function saga(args: string[], env: Record<string, string> = {}, apiOverrides = {}) {
  const harness = createDependencies(apiOverrides);
  Object.assign(harness.dependencies.env, env);
  const exitCode = await runCli(['node', 'hagi', 'saga', ...args], harness.dependencies);
  return { exitCode, stdout: harness.stdout.join(''), stderr: harness.stderr.join(''), api: harness.api };
}

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-mark-')));
  projectPath = path.join(workspace, 'Project With Spaces');
  mkdirSync(projectPath);
  sagaRoot = path.join(projectPath, '.hagicode', 'sagas');
  installSagaResources(projectPath, loadSagaAssets());
  createPlannedSagaAt(sagaRoot, 'demo');
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(workspace, { recursive: true, force: true });
});

describe('saga mark: success', () => {
  it('marks the session with exactly the saga.id and saga.role pair and exits 0', async () => {
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1']);

    expect(result.exitCode).toBe(0);
    expect(result.api.addSessionUserMetadata).toHaveBeenCalledTimes(1);
    expect(result.api.addSessionUserMetadata).toHaveBeenCalledWith('s1', MARK_METADATA);
    expect(result.stdout).toBe('marked: demo (session s1)\n');
    expect(result.stderr).toBe('');
  });

  it('prints the stable JSON object without command or ok fields', async () => {
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1', '--json']);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({ sagaId: 'demo', sessionId: 's1', marked: true });
  });
});

describe('saga mark: repeat and conflict', () => {
  it('succeeds on a repeat of the same session and Saga, with both runs exiting 0', async () => {
    const accept = vi.fn().mockResolvedValue({});
    const first = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1', '--json'], {}, { addSessionUserMetadata: accept });
    const second = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1', '--json'], {}, { addSessionUserMetadata: accept });

    expect(first.exitCode).toBe(0);
    expect(second.exitCode).toBe(0);
    expect(JSON.parse(first.stdout).marked).toBe(true);
    expect(JSON.parse(second.stdout).marked).toBe(true);
    expect(accept).toHaveBeenCalledTimes(2);
  });

  it('refuses a session that already names another Saga: exit 1, one reason line, printed once, marker untouched', async () => {
    const conflict = vi.fn().mockRejectedValue(new Error('session s1 already has saga.id=other'));
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1'], {}, { addSessionUserMetadata: conflict });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.stdout).toBe('mark failed: demo (session s1): session s1 already has saga.id=other\n');
    expect(result.stdout.match(/mark failed/g)).toHaveLength(1);
    expect(result.stderr).toBe('');
  });

  it('reports the conflict in JSON with marked false and the backend reason', async () => {
    const conflict = vi.fn().mockRejectedValue(new Error('session s1 already has saga.id=other'));
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1', '--json'], {}, { addSessionUserMetadata: conflict });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(result.stdout)).toEqual({
      sagaId: 'demo',
      sessionId: 's1',
      marked: false,
      reason: 'session s1 already has saga.id=other',
    });
    expect(result.stderr).toBe('');
  });
});

describe('saga mark: backend failures', () => {
  it('reports a rejected call as a one-line reason with exit 1', async () => {
    const rejected = vi.fn().mockRejectedValue(new Error('session not found'));
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1', '--json'], {}, { addSessionUserMetadata: rejected });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(result.stdout)).toEqual({ sagaId: 'demo', sessionId: 's1', marked: false, reason: 'session not found' });
  });

  it('reports an unreachable backend as a failed mark with exit 1', async () => {
    const unreachable = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:1'));
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1'], {}, { addSessionUserMetadata: unreachable });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
    expect(result.stdout).toContain('mark failed: demo (session s1): connect ECONNREFUSED');
  });

  it('gives up after 10 seconds with exit 1 and leaves no timer running', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const silent = vi.fn(() => new Promise<never>(() => {}));
    const harness = createDependencies({ addSessionUserMetadata: silent });
    const pending = runCli(['node', 'hagi', 'saga', 'mark', 'demo', '--path', projectPath, '--session', 's1', '--json'], harness.dependencies);
    await waitForCall(silent);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(await pending).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(harness.stdout.join(''))).toEqual({
      sagaId: 'demo',
      sessionId: 's1',
      marked: false,
      reason: 'no answer within 10 s',
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not report a timeout before 10 seconds', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const silent = vi.fn(() => new Promise<never>(() => {}));
    const harness = createDependencies({ addSessionUserMetadata: silent });
    const pending = runCli(['node', 'hagi', 'saga', 'mark', 'demo', '--path', projectPath, '--session', 's1'], harness.dependencies);
    await waitForCall(silent);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(harness.stdout.join('')).toBe('');
    expect(vi.getTimerCount()).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toBe(EXIT_CODES.REFUSED);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('saga mark: refusals before any backend call', () => {
  it('exits 24 for an unknown Saga and calls no backend', async () => {
    const result = await saga(['mark', 'missing', '--path', projectPath, '--session', 's1']);

    expect(result.exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(result.api.addSessionUserMetadata).not.toHaveBeenCalled();
    expect(existsSync(sagaDirectory('missing'))).toBe(false);
  });

  it('exits 24 for an invalid or reserved Saga ID without calling the backend or changing a file', async () => {
    const before = snapshotFiles(sagaRoot);
    for (const sagaId of ['runtime', '..']) {
      const result = await saga(['mark', sagaId, '--path', projectPath, '--session', 's1']);
      expect(result.exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
      expect(result.api.addSessionUserMetadata).not.toHaveBeenCalled();
    }
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });

  it('exits 2 with no session in the option or the environment, without a backend call or any file', async () => {
    const before = snapshotFiles(sagaRoot);
    const result = await saga(['mark', 'demo', '--path', projectPath]);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('--session <session-id>');
    expect(result.api.addSessionUserMetadata).not.toHaveBeenCalled();
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });

  it('treats a blank session as missing and exits 2', async () => {
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', '   '], { HAGI_SESSION_ID: '  ' });

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.api.addSessionUserMetadata).not.toHaveBeenCalled();
  });

  it('uses HAGI_SESSION_ID when --session is absent, and --session over the environment', async () => {
    const fromEnv = await saga(['mark', 'demo', '--path', projectPath], { HAGI_SESSION_ID: 's2' });
    expect(fromEnv.exitCode).toBe(0);
    expect(fromEnv.api.addSessionUserMetadata).toHaveBeenCalledWith('s2', MARK_METADATA);

    const fromOption = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1'], { HAGI_SESSION_ID: 's2' });
    expect(fromOption.api.addSessionUserMetadata).toHaveBeenCalledWith('s1', MARK_METADATA);
  });

  it('exits 2 for a missing selector before any backend call', async () => {
    const result = await saga(['mark', 'demo', '--session', 's1']);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.api.addSessionUserMetadata).not.toHaveBeenCalled();
  });
});

describe('saga mark: no token and no ownership', () => {
  it('marks a Saga whose lock another session holds, without a token, and changes no Saga file', async () => {
    const claim = await saga(['claim', 'demo', '--path', projectPath, '--session', 'other', '--json']);
    expect(claim.exitCode).toBe(0);
    expect(existsSync(path.join(sagaDirectory(), 'runtime', 'execute.lock'))).toBe(true);
    const before = snapshotFiles(sagaRoot);

    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1', '--json']);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).marked).toBe(true);
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });

  it('does not touch the Saga directory with no token and no lock', async () => {
    const before = snapshotFiles(sagaRoot);
    const result = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1']);

    expect(result.exitCode).toBe(0);
    expect(snapshotFiles(sagaRoot)).toEqual(before);
    expect(existsSync(path.join(sagaDirectory(), 'runtime'))).toBe(false);
  });

  it('writes the same metadata entries as claim', async () => {
    const claimed = await saga(['claim', 'demo', '--path', projectPath, '--session', 's1']);
    const marked = await saga(['mark', 'demo', '--path', projectPath, '--session', 's1']);

    expect(claimed.api.addSessionUserMetadata).toHaveBeenCalledWith('s1', MARK_METADATA);
    expect(marked.api.addSessionUserMetadata).toHaveBeenCalledWith('s1', MARK_METADATA);
    expect(marked.api.addSessionUserMetadata.mock.calls).toEqual(claimed.api.addSessionUserMetadata.mock.calls);
  });
});

describe('saga mark: help text', () => {
  it('states the pair, the fallback, the bound, add-only behaviour and the exit codes', async () => {
    const harness = createDependencies();
    expect(await runCli(['node', 'hagi', 'saga', 'mark', '--help'], harness.dependencies)).toBe(0);
    const help = harness.stdout.join('');

    for (const fact of [
      'saga.id=<saga-id> and saga.role=master',
      'takes no execution token',
      'takes no ownership',
      'HAGI_SESSION_ID',
      'gives up after 10 seconds',
      'succeeds unchanged',
      'add-only',
      '0 marked',
      '1 mark failed',
      '2 usage error',
      '24 Saga not found',
    ]) {
      expect(help).toContain(fact);
    }
  });
});

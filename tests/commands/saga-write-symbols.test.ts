import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { markMasterSession, markSaga, MASTER_MARK_TIMEOUT_MS } from '../../src/commands/saga/write';
import { CliSagaRefusalError, CliUsageError } from '../../src/runtime/errors';

const mocks = vi.hoisted(() => ({
  sagaRoot: '',
  outputJson: false,
  stdout: [] as string[],
}));

vi.mock('../../src/commands/saga/shared', () => ({
  resolveExecutionToken: () => undefined,
  resolveSagaCommandContext: async () => ({
    sagaRoot: mocks.sagaRoot,
    outputJson: mocks.outputJson,
    io: { stdout: (text: string) => mocks.stdout.push(text) },
  }),
}));

// The real context resolves a backend base URL from flags, env and the user's config file; the commands under test only need the api.
vi.mock('../../src/runtime/commandContext', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/runtime/commandContext')>()),
  createCommandContext: (_command: unknown, dependencies: { api: unknown }) => ({ api: dependencies.api }),
}));

type FakeApi = { addSessionUserMetadata: ReturnType<typeof vi.fn> };

const makeDependencies = (api: FakeApi, env: Record<string, string> = {}) =>
  ({ api, env, io: { stdout: vi.fn(), stderr: vi.fn() } }) as never;

const makeCommand = (options: Record<string, unknown> = {}) =>
  ({ opts: () => options, optsWithGlobals: () => options }) as unknown as Command;

let workspace: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-write-symbols-')));
  mocks.sagaRoot = path.join(workspace, '.hagicode', 'sagas');
  mkdirSync(path.join(mocks.sagaRoot, 'demo'), { recursive: true });
  mocks.outputJson = false;
  mocks.stdout = [];
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(workspace, { recursive: true, force: true });
});

describe('markMasterSession (src/commands/saga/write.ts)', () => {
  it('adds the saga id and master role to the session metadata and reports it as marked', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockResolvedValue(undefined) };

    const mark = await markMasterSession(makeCommand(), makeDependencies(api), 'demo', 'session-1');

    expect(mark).toEqual({ sessionId: 'session-1', marked: true });
    expect(api.addSessionUserMetadata).toHaveBeenCalledTimes(1);
    expect(api.addSessionUserMetadata).toHaveBeenCalledWith('session-1', { 'saga.id': 'demo', 'saga.role': 'master' });
  });

  it('reports a backend rejection as not marked instead of throwing', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockRejectedValue(new Error('session not found')) };

    const mark = await markMasterSession(makeCommand(), makeDependencies(api), 'demo', 'session-1');

    expect(mark).toEqual({ sessionId: 'session-1', marked: false, reason: 'session not found' });
  });

  it('stringifies a non-Error rejection as the reason', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockRejectedValue('plain failure') };

    const mark = await markMasterSession(makeCommand(), makeDependencies(api), 'demo', 'session-1');

    expect(mark).toEqual({ sessionId: 'session-1', marked: false, reason: 'plain failure' });
  });

  it('reports a synchronous failure while resolving the api as not marked', async () => {
    const dependencies = {
      get api(): never {
        throw new Error('api unavailable');
      },
      env: {},
      io: { stdout: vi.fn(), stderr: vi.fn() },
    } as never;

    const mark = await markMasterSession(makeCommand(), dependencies, 'demo', 'session-1');

    expect(mark).toMatchObject({ sessionId: 'session-1', marked: false });
  });

  it('gives up after the mark timeout and names the wait in the reason', async () => {
    vi.useFakeTimers();
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockReturnValue(new Promise(() => undefined)) };

    const pending = markMasterSession(makeCommand(), makeDependencies(api), 'demo', 'session-1');
    await vi.advanceTimersByTimeAsync(MASTER_MARK_TIMEOUT_MS);

    await expect(pending).resolves.toEqual({
      sessionId: 'session-1',
      marked: false,
      reason: `no answer within ${MASTER_MARK_TIMEOUT_MS / 1000} s`,
    });
  });

  it('does not time out when the backend answers in time, and leaves no timer behind', async () => {
    vi.useFakeTimers();
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockResolvedValue(undefined) };

    const mark = await markMasterSession(makeCommand(), makeDependencies(api), 'demo', 'session-1');

    expect(mark.marked).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('exposes a ten second timeout', () => {
    expect(MASTER_MARK_TIMEOUT_MS).toBe(10_000);
  });
});

describe('markSaga (src/commands/saga/write.ts)', () => {
  const run = (api: FakeApi, positionals: string[], options: Record<string, unknown> = {}, env: Record<string, string> = {}) => {
    const command = makeCommand(options);
    return markSaga(makeDependencies(api, env)).call(command, ...positionals, options, command);
  };

  it('marks the session given with --session and prints the human confirmation', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockResolvedValue(undefined) };

    await run(api, ['demo'], { session: 'plan-session' });

    expect(api.addSessionUserMetadata).toHaveBeenCalledWith('plan-session', { 'saga.id': 'demo', 'saga.role': 'master' });
    expect(mocks.stdout).toEqual(['marked: demo (session plan-session)\n']);
  });

  it('falls back to HAGI_SESSION_ID when --session is absent', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockResolvedValue(undefined) };

    await run(api, ['demo'], {}, { HAGI_SESSION_ID: 'env-session' });

    expect(api.addSessionUserMetadata).toHaveBeenCalledWith('env-session', expect.any(Object));
  });

  it('prints the result as JSON when JSON output is on', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockResolvedValue(undefined) };
    mocks.outputJson = true;

    await run(api, ['demo'], { session: 'plan-session' });

    expect(JSON.parse(mocks.stdout[0])).toEqual({ sagaId: 'demo', sessionId: 'plan-session', marked: true });
  });

  it('stops with a usage error before touching the backend when no session is known', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn() };

    await expect(run(api, ['demo'])).rejects.toBeInstanceOf(CliUsageError);

    expect(api.addSessionUserMetadata).not.toHaveBeenCalled();
    expect(mocks.stdout).toEqual([]);
  });

  it('requires a Saga ID', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn() };

    await expect(run(api, [], { session: 's' })).rejects.toThrow('mark requires a Saga ID.');

    expect(api.addSessionUserMetadata).not.toHaveBeenCalled();
  });

  it('fails for a Saga that does not exist without calling the backend', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn() };

    await expect(run(api, ['missing'], { session: 's' })).rejects.toThrow();

    expect(api.addSessionUserMetadata).not.toHaveBeenCalled();
  });

  it('prints the failure, then exits through a reported refusal when the mark fails', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockRejectedValue(new Error('backend down')) };

    const error = await run(api, ['demo'], { session: 'plan-session' }).catch((caught: unknown) => caught);

    expect(mocks.stdout).toEqual(['mark failed: demo (session plan-session): backend down\n']);
    expect(error).toBeInstanceOf(CliSagaRefusalError);
    expect((error as CliSagaRefusalError).reasons).toEqual(['backend down']);
    expect((error as CliSagaRefusalError).reported).toBe(true);
  });

  it('prints a failed mark as JSON with the reason', async () => {
    const api: FakeApi = { addSessionUserMetadata: vi.fn().mockRejectedValue(new Error('backend down')) };
    mocks.outputJson = true;

    await expect(run(api, ['demo'], { session: 'plan-session' })).rejects.toBeInstanceOf(CliSagaRefusalError);

    expect(JSON.parse(mocks.stdout[0])).toEqual({
      sagaId: 'demo',
      sessionId: 'plan-session',
      marked: false,
      reason: 'backend down',
    });
  });
});

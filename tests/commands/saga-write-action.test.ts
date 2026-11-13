import type { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MASTER_MARK_TIMEOUT_MS,
  amendSagaCommand,
  archiveSagaCommand,
  assertSagaOwner,
  blockSaga,
  checkSaga,
  claimSaga,
  freezeSaga,
  releaseSaga,
  sagaWriteAction,
  setStatusSaga,
  tickSaga,
} from '../../src/commands/saga/write';
import { CliSagaRefusalError, CliUsageError } from '../../src/runtime/errors';

const mocks = vi.hoisted(() => ({
  token: 'env-token' as string | undefined,
  resolveContext: vi.fn(),
  requireSagaDirectory: vi.fn(),
  assertOwner: vi.fn(),
  claimExecution: vi.fn(),
  releaseExecution: vi.fn(),
  freezeContract: vi.fn(),
  tickItem: vi.fn(),
  blockItem: vi.fn(),
  amendSaga: vi.fn(),
  archiveSaga: vi.fn(),
  setStatus: vi.fn(),
  checkRun: vi.fn(),
  addSessionUserMetadata: vi.fn(),
}));

vi.mock('../../src/commands/saga/shared', () => ({
  resolveExecutionToken: () => mocks.token,
  resolveSagaCommandContext: (...args: unknown[]) => mocks.resolveContext(...args),
}));

vi.mock('../../src/runtime/saga/read', () => ({ requireSagaDirectory: mocks.requireSagaDirectory }));
vi.mock('../../src/runtime/saga/ownership', () => ({
  assertOwner: mocks.assertOwner,
  claimExecution: mocks.claimExecution,
  releaseExecution: mocks.releaseExecution,
}));
vi.mock('../../src/runtime/saga/freeze', () => ({ freezeContract: mocks.freezeContract }));
vi.mock('../../src/runtime/saga/mutate', () => ({
  tickItem: mocks.tickItem,
  blockItem: mocks.blockItem,
  amendSaga: mocks.amendSaga,
  archiveSaga: mocks.archiveSaga,
}));
vi.mock('../../src/runtime/saga/statusWrite', () => ({
  setStatus: mocks.setStatus,
  isWritableState: (value: unknown) => value === 'running' || value === 'paused' || value === 'done',
  WRITABLE_STATES: ['running', 'paused', 'done'],
}));
vi.mock('../../src/runtime/saga/check', () => ({ checkRun: mocks.checkRun }));

vi.mock('../../src/runtime/commandContext', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/runtime/commandContext')>()),
  createCommandContext: () => ({ api: { addSessionUserMetadata: mocks.addSessionUserMetadata } }),
}));

vi.mock('../../src/formatters/saga', () => ({
  formatSagaWriteHuman: (name: string, result: unknown) => `WRITE ${name} ${JSON.stringify(result)}\n`,
  formatSagaRefusalHuman: (name: string, sagaId: string, reasons: string[]) => `REFUSED ${name} ${sagaId} ${reasons.join('|')}\n`,
  formatSagaRefusalExtras: (details: Record<string, unknown>) => (Object.keys(details).length > 0 ? `EXTRAS ${JSON.stringify(details)}\n` : ''),
}));

let stdout: string[];
let outputJson: boolean;

const dependencies = { env: {} } as never;

/** Runs a command action the way commander does: positionals, then the options object, then the command. */
const run = (action: (this: Command, ...args: unknown[]) => Promise<void>, positionals: string[], options: Record<string, unknown> = {}) => {
  const command = { opts: () => options } as unknown as Command;
  return action.call(command, ...positionals, options, command);
};

beforeEach(() => {
  stdout = [];
  outputJson = false;
  mocks.token = 'env-token';
  mocks.resolveContext.mockReset().mockImplementation(async () => ({
    sagaRoot: '/projects/demo/.hagicode/sagas',
    io: { stdout: (text: string) => stdout.push(text) },
    outputJson,
  }));
  for (const key of ['requireSagaDirectory', 'assertOwner', 'claimExecution', 'releaseExecution', 'freezeContract', 'tickItem', 'blockItem', 'amendSaga', 'archiveSaga', 'setStatus', 'checkRun', 'addSessionUserMetadata'] as const) {
    mocks[key].mockReset();
  }
  mocks.assertOwner.mockReturnValue({ locked: true, ownerSession: 'owner-1' });
  mocks.addSessionUserMetadata.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('sagaWriteAction', () => {
  const spec = (overrides: Record<string, unknown> = {}) => ({
    name: 'demo-cmd',
    takesToken: false,
    run: vi.fn().mockResolvedValue({ extra: 1 }),
    ...overrides,
  });

  it('runs the operation for the first positional as the Saga id and prints the human result', async () => {
    const s = spec();

    await run(sagaWriteAction(dependencies, s as never), ['saga-1', 'item-2']);

    expect(mocks.requireSagaDirectory).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1');
    expect(s.run).toHaveBeenCalledWith(
      expect.objectContaining({ sagaId: 'saga-1', sagaRoot: '/projects/demo/.hagicode/sagas', token: undefined }),
      {},
      ['saga-1', 'item-2'],
    );
    expect(stdout.join('')).toBe('WRITE demo-cmd {"sagaId":"saga-1","command":"demo-cmd","ok":true,"extra":1}\n');
  });

  it('prints the result as JSON with --json', async () => {
    outputJson = true;

    await run(sagaWriteAction(dependencies, spec() as never), ['saga-1']);

    expect(JSON.parse(stdout.join(''))).toEqual({ sagaId: 'saga-1', command: 'demo-cmd', ok: true, extra: 1 });
  });

  it('accepts a synchronous operation', async () => {
    await run(sagaWriteAction(dependencies, spec({ run: () => ({ sync: true }) }) as never), ['saga-1']);

    expect(stdout.join('')).toContain('"sync":true');
  });

  it('reads the execution token only for commands that take one', async () => {
    const taking = spec({ takesToken: true });
    const notTaking = spec();

    await run(sagaWriteAction(dependencies, taking as never), ['s']);
    await run(sagaWriteAction(dependencies, notTaking as never), ['s']);

    expect(taking.run.mock.calls[0][0].token).toBe('env-token');
    expect(notTaking.run.mock.calls[0][0].token).toBeUndefined();
  });

  it('runs the usage check before the token, the context or any file access', async () => {
    const preflight = vi.fn(() => {
      throw new CliUsageError('bad usage');
    });

    await expect(run(sagaWriteAction(dependencies, spec({ preflight }) as never), ['saga-1'], { x: 1 })).rejects.toThrow('bad usage');

    expect(preflight).toHaveBeenCalledWith({ x: 1 });
    expect(mocks.resolveContext).not.toHaveBeenCalled();
    expect(mocks.requireSagaDirectory).not.toHaveBeenCalled();
  });

  it('refuses a missing Saga id with a usage error naming the command', async () => {
    const s = spec();

    await expect(run(sagaWriteAction(dependencies, s as never), [])).rejects.toThrow('demo-cmd requires a Saga ID.');
    expect(s.run).not.toHaveBeenCalled();
  });

  it('stops when the Saga directory does not exist', async () => {
    mocks.requireSagaDirectory.mockImplementation(() => {
      throw new Error('no such saga');
    });
    const s = spec();

    await expect(run(sagaWriteAction(dependencies, s as never), ['ghost'])).rejects.toThrow('no such saga');
    expect(s.run).not.toHaveBeenCalled();
  });

  it('checks the owner before the operation when the command is guarded', async () => {
    const order: string[] = [];
    mocks.assertOwner.mockImplementation(() => order.push('owner'));
    const s = spec({ takesToken: true, guard: true, run: vi.fn(async () => order.push('run') && {}) });

    await run(sagaWriteAction(dependencies, s as never), ['saga-1']);

    expect(mocks.assertOwner).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'env-token');
    expect(order).toEqual(['owner', 'run']);
  });

  it('does not run the operation when the owner check fails', async () => {
    mocks.assertOwner.mockImplementation(() => {
      throw new CliSagaRefusalError(['wrong token']);
    });
    const s = spec({ takesToken: true, guard: true });

    await expect(run(sagaWriteAction(dependencies, s as never), ['saga-1'])).rejects.toBeInstanceOf(CliSagaRefusalError);
    expect(s.run).not.toHaveBeenCalled();
  });

  it('does not check the owner for an unguarded command', async () => {
    await run(sagaWriteAction(dependencies, spec() as never), ['saga-1']);

    expect(mocks.assertOwner).not.toHaveBeenCalled();
  });

  it('reports a refusal in human form with its extras, marks it reported and rethrows', async () => {
    const refusal = new CliSagaRefusalError(['first', 'second'], { details: { methods: ['m'] } });

    await expect(run(sagaWriteAction(dependencies, spec({ run: () => Promise.reject(refusal) }) as never), ['saga-1'])).rejects.toBe(refusal);

    expect(stdout.join('')).toBe('REFUSED demo-cmd saga-1 first|second\nEXTRAS {"methods":["m"]}\n');
    expect(refusal.reported).toBe(true);
  });

  it('reports a refusal as JSON with ok false, the reasons and the details', async () => {
    outputJson = true;
    const refusal = new CliSagaRefusalError(['nope'], { details: { methods: ['m'] } });

    await expect(run(sagaWriteAction(dependencies, spec({ run: () => Promise.reject(refusal) }) as never), ['saga-1'])).rejects.toBe(refusal);

    expect(JSON.parse(stdout.join(''))).toEqual({ sagaId: 'saga-1', command: 'demo-cmd', ok: false, errors: ['nope'], methods: ['m'] });
  });

  it('prints nothing for an error that is not a refusal, and rethrows it', async () => {
    const failure = new Error('disk full');

    await expect(run(sagaWriteAction(dependencies, spec({ run: () => Promise.reject(failure) }) as never), ['saga-1'])).rejects.toBe(failure);
    expect(stdout).toEqual([]);
  });
});

describe('claimSaga', () => {
  const claim = (options: Record<string, unknown> = { session: 'owner-1' }) => run(claimSaga(dependencies), ['saga-1'], options);

  beforeEach(() => {
    mocks.claimExecution.mockReturnValue({ ownerSession: 'owner-1', token: 'new-token', createdAt: '2026-11-12T00:00:00Z' });
  });

  it.each([undefined, '', '   ', 5])('requires --session or HAGI_SESSION_ID, got %j', async session => {
    await expect(claim({ session })).rejects.toThrow('No session ID. Pass --session <session-id>, or set HAGI_SESSION_ID.');
    expect(mocks.claimExecution).not.toHaveBeenCalled();
    expect(mocks.resolveContext).not.toHaveBeenCalled();
  });

  it.each([undefined, '', '   '])('falls back to HAGI_SESSION_ID when --session is %j, and marks that session as master', async session => {
    mocks.claimExecution.mockImplementation((_root: string, _id: string, owner: string) => ({
      ownerSession: owner,
      token: 'new-token',
      createdAt: '2026-11-12T00:00:00Z',
    }));
    const envDependencies = { env: { HAGI_SESSION_ID: 'env-owner' } } as never;

    await run(claimSaga(envDependencies), ['saga-1'], { session });

    expect(mocks.claimExecution).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'env-owner');
    expect(mocks.addSessionUserMetadata).toHaveBeenCalledWith('env-owner', { 'saga.id': 'saga-1', 'saga.role': 'master' });
  });

  it('lets an explicit --session win over HAGI_SESSION_ID', async () => {
    const envDependencies = { env: { HAGI_SESSION_ID: 'env-owner' } } as never;

    await run(claimSaga(envDependencies), ['saga-1'], { session: 'owner-1' });

    expect(mocks.claimExecution).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'owner-1');
  });

  it('claims the Saga, marks the owner session as master and reports the token', async () => {
    outputJson = true;

    await claim();

    expect(mocks.claimExecution).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'owner-1');
    expect(mocks.addSessionUserMetadata).toHaveBeenCalledWith('owner-1', { 'saga.id': 'saga-1', 'saga.role': 'master' });
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      command: 'claim',
      ok: true,
      ownerSession: 'owner-1',
      token: 'new-token',
      createdAt: '2026-11-12T00:00:00Z',
      master: { sessionId: 'owner-1', marked: true },
    });
  });

  it('does not take the execution token for a claim', async () => {
    mocks.token = 'should-not-be-used';
    outputJson = true;

    await claim();

    expect(JSON.parse(stdout.join('')).token).toBe('new-token');
  });

  it('skips the backend mark with --no-mark-session and says why', async () => {
    outputJson = true;

    await claim({ session: 'owner-1', markSession: false });

    expect(mocks.addSessionUserMetadata).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.join('')).master).toEqual({ sessionId: 'owner-1', marked: false, reason: 'skipped by --no-mark-session' });
  });

  it('reports a failed mark without failing the claim', async () => {
    outputJson = true;
    mocks.addSessionUserMetadata.mockRejectedValue(new Error('not a HagiCode session'));

    await claim();

    expect(JSON.parse(stdout.join(''))).toMatchObject({ ok: true, master: { sessionId: 'owner-1', marked: false, reason: 'not a HagiCode session' } });
  });

  it('reports a non-Error failure of the mark as text', async () => {
    outputJson = true;
    mocks.addSessionUserMetadata.mockRejectedValue('plain failure');

    await claim();

    expect(JSON.parse(stdout.join('')).master.reason).toBe('plain failure');
  });

  it('gives up on a backend that never answers after the mark timeout', async () => {
    vi.useFakeTimers();
    outputJson = true;
    mocks.addSessionUserMetadata.mockReturnValue(new Promise(() => undefined));

    const pending = claim();
    await vi.advanceTimersByTimeAsync(MASTER_MARK_TIMEOUT_MS);
    await pending;

    expect(MASTER_MARK_TIMEOUT_MS).toBe(10_000);
    expect(JSON.parse(stdout.join('')).master).toEqual({ sessionId: 'owner-1', marked: false, reason: 'no answer within 10 s' });
  });

  it('leaves no timer behind once the mark answered', async () => {
    vi.useFakeTimers();

    await claim();

    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('the other Saga commands', () => {
  it('assert-owner reports a locked Saga with its owner, and an unlocked one without', async () => {
    outputJson = true;
    await run(assertSagaOwner(dependencies), ['saga-1']);
    mocks.assertOwner.mockReturnValue({ locked: false });
    await run(assertSagaOwner(dependencies), ['saga-1']);

    const [locked, unlocked] = stdout.map(text => JSON.parse(text));
    expect(locked).toMatchObject({ command: 'assert-owner', locked: true, ownerSession: 'owner-1' });
    expect(unlocked).toMatchObject({ command: 'assert-owner', locked: false });
    expect(unlocked).not.toHaveProperty('ownerSession');
  });

  it('assert-owner is not guarded, since it is the check itself', async () => {
    await run(assertSagaOwner(dependencies), ['saga-1']);

    expect(mocks.assertOwner).toHaveBeenCalledTimes(1);
  });

  it('freeze reports the revision outcome and defaults a missing previous revision to null', async () => {
    outputJson = true;
    mocks.freezeContract.mockReturnValue({ revision: 3, unchanged: false, reopened: true, added: ['x'] });

    await run(freezeSaga(dependencies), ['saga-1']);

    expect(JSON.parse(stdout.join(''))).toMatchObject({ command: 'freeze', revision: 3, previousRevision: null, unchanged: false, reopened: true, added: ['x'] });
    expect(mocks.assertOwner).toHaveBeenCalledTimes(1);
  });

  it('tick, block, amend and archive pass their positionals to the operation', async () => {
    mocks.tickItem.mockReturnValue({ ticked: 'T1' });
    mocks.blockItem.mockReturnValue({ blocked: 'T2' });
    mocks.amendSaga.mockReturnValue({ name: 'amendment-1' });
    mocks.archiveSaga.mockReturnValue({ archived: true });

    await run(tickSaga(dependencies), ['saga-1', 'T1']);
    await run(blockSaga(dependencies), ['saga-1', 'T2', 'waiting']);
    await run(amendSagaCommand(dependencies), ['saga-1', 'amendment-1', 'text']);
    await run(archiveSagaCommand(dependencies), ['saga-1'], { force: true });

    expect(mocks.tickItem).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'T1');
    expect(mocks.blockItem).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'T2', 'waiting');
    expect(mocks.amendSaga).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'amendment-1', 'text');
    expect(mocks.archiveSaga).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', true);
    expect(mocks.assertOwner).toHaveBeenCalledTimes(4);
  });

  it('amend defaults a missing text to an empty string and reports merged false', async () => {
    outputJson = true;
    mocks.amendSaga.mockReturnValue({ name: 'a-1' });

    await run(amendSagaCommand(dependencies), ['saga-1', 'a-1']);

    expect(mocks.amendSaga).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'a-1', '');
    expect(JSON.parse(stdout.join(''))).toMatchObject({ name: 'a-1', merged: false });
  });

  it('archive passes force only when it is exactly true', async () => {
    mocks.archiveSaga.mockReturnValue({});

    await run(archiveSagaCommand(dependencies), ['saga-1'], { force: 'yes' });
    await run(archiveSagaCommand(dependencies), ['saga-1']);

    expect(mocks.archiveSaga.mock.calls.map(call => call[2])).toEqual([false, false]);
  });

  it.each(['running', 'paused', 'done'])('set-status accepts the state %s and passes the note', async state => {
    mocks.setStatus.mockReturnValue({ state });

    await run(setStatusSaga(dependencies), ['saga-1'], { state, note: 'why' });

    expect(mocks.setStatus).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', state, 'why');
  });

  it('set-status rejects an unknown state before any file access, listing the allowed ones', async () => {
    await expect(run(setStatusSaga(dependencies), ['saga-1'], { state: 'nope' })).rejects.toThrow('--state must be one of running, paused, done.');
    expect(mocks.resolveContext).not.toHaveBeenCalled();
  });

  it('check rejects a phase other than plan or run before any file access', async () => {
    await expect(run(checkSaga(dependencies), ['saga-1'], { phase: 'later' })).rejects.toThrow('check --phase must be plan or run.');
    await expect(run(checkSaga(dependencies), ['saga-1'], {})).rejects.toBeInstanceOf(CliUsageError);
    expect(mocks.resolveContext).not.toHaveBeenCalled();
  });

  it('check reports a clean run with the phase and the method report when there is one', async () => {
    outputJson = true;
    mocks.checkRun.mockReturnValue({ errors: [], methods: { drift: false } });

    await run(checkSaga(dependencies), ['saga-1'], { phase: 'plan' });

    expect(mocks.checkRun).toHaveBeenCalledWith('/projects/demo/.hagicode/sagas', 'saga-1', 'plan');
    expect(JSON.parse(stdout.join(''))).toMatchObject({ command: 'check', ok: true, phase: 'plan', errors: [], methods: { drift: false } });
    expect(mocks.assertOwner).not.toHaveBeenCalled();
  });

  it('check leaves out the method report when there is none', async () => {
    outputJson = true;
    mocks.checkRun.mockReturnValue({ errors: [] });

    await run(checkSaga(dependencies), ['saga-1'], { phase: 'run' });

    expect(JSON.parse(stdout.join(''))).not.toHaveProperty('methods');
  });

  it('check refuses with its errors and the method report when errors were found', async () => {
    outputJson = true;
    mocks.checkRun.mockReturnValue({ errors: ['missing file'], methods: { drift: true } });

    await expect(run(checkSaga(dependencies), ['saga-1'], { phase: 'run' })).rejects.toBeInstanceOf(CliSagaRefusalError);

    expect(JSON.parse(stdout.join(''))).toEqual({ sagaId: 'saga-1', command: 'check', ok: false, errors: ['missing file'], methods: { drift: true } });
  });

  it('release passes the token and whether the workers settled, and reports the owner', async () => {
    outputJson = true;
    mocks.releaseExecution.mockReturnValue({ ownerSession: 'owner-1' });

    await run(releaseSaga(dependencies), ['saga-1'], { workersSettled: true });
    await run(releaseSaga(dependencies), ['saga-1'], { workersSettled: 'true' });

    expect(mocks.releaseExecution).toHaveBeenNthCalledWith(1, '/projects/demo/.hagicode/sagas', 'saga-1', { token: 'env-token', workersSettled: true });
    expect(mocks.releaseExecution).toHaveBeenNthCalledWith(2, '/projects/demo/.hagicode/sagas', 'saga-1', { token: 'env-token', workersSettled: false });
    expect(JSON.parse(stdout[0])).toMatchObject({ command: 'release', released: true, ownerSession: 'owner-1' });
    expect(mocks.assertOwner).not.toHaveBeenCalled();
  });
});

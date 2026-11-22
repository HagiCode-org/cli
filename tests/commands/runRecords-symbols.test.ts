import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appendOrchestratorLog, listWorkerSessions } from '../../src/commands/saga/runRecords';
import { CliSagaRefusalError, CliUsageError } from '../../src/runtime/errors';

const mocks = vi.hoisted(() => ({
  token: undefined as string | undefined,
  sagaRoot: '',
  outputJson: false,
  stdout: [] as string[],
}));

vi.mock('../../src/commands/saga/shared', () => ({
  resolveExecutionToken: () => mocks.token,
  resolveSagaCommandContext: async () => ({
    sagaRoot: mocks.sagaRoot,
    outputJson: mocks.outputJson,
    io: { stdout: (text: string) => mocks.stdout.push(text) },
  }),
}));

const dependencies = { env: {} } as never;
const RECORD_LINE = '- worker-1 | 2026-11-11T10:00:00Z | implementation | T1 | T1 implementation\n';

let workspace: string;
let sagaDir: string;

/** Runs a command action the way commander does: positionals, then the options object, then the command. */
const run = (action: (this: Command, ...args: unknown[]) => Promise<void>, positionals: string[], options: Record<string, unknown> = {}) => {
  const command = { opts: () => options } as unknown as Command;
  return action.call(command, ...positionals, options, command);
};

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-run-records-symbols-')));
  mocks.sagaRoot = path.join(workspace, '.hagicode', 'sagas');
  sagaDir = path.join(mocks.sagaRoot, 'demo');
  mkdirSync(sagaDir, { recursive: true });
  mocks.token = undefined;
  mocks.outputJson = false;
  mocks.stdout = [];
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('listWorkerSessions (src/commands/saga/runRecords.ts)', () => {
  it('prints the payload with the session list command name as JSON', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'));
    writeFileSync(path.join(sagaDir, 'runtime', 'sessions.md'), RECORD_LINE + '- worker-2 | 2026-11-11T10:05:00Z | verification | - | Verify\n');
    mocks.outputJson = true;

    await run(listWorkerSessions(dependencies), ['demo']);

    expect(mocks.stdout).toHaveLength(1);
    expect(JSON.parse(mocks.stdout[0])).toEqual({
      sagaId: 'demo',
      command: 'session list',
      ok: true,
      sessions: [
        { sessionId: 'worker-1', createdAt: '2026-11-11T10:00:00Z', role: 'implementation', item: 'T1', title: 'T1 implementation' },
        { sessionId: 'worker-2', createdAt: '2026-11-11T10:05:00Z', role: 'verification', item: null, title: 'Verify' },
      ],
    });
  });

  it('prints human output that names the Worker session when JSON is off', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'));
    writeFileSync(path.join(sagaDir, 'runtime', 'sessions.md'), RECORD_LINE);

    await run(listWorkerSessions(dependencies), ['demo']);

    expect(mocks.stdout).toHaveLength(1);
    expect(mocks.stdout[0]).toContain('worker-1');
    expect(() => JSON.parse(mocks.stdout[0])).toThrow();
  });

  it('reports an empty session list when sessions.md is missing and writes nothing', async () => {
    mocks.outputJson = true;

    await run(listWorkerSessions(dependencies), ['demo']);

    expect(JSON.parse(mocks.stdout[0]).sessions).toEqual([]);
    expect(existsSync(path.join(sagaDir, 'runtime'))).toBe(false);
  });

  it('fails for a Saga that does not exist before printing anything', async () => {
    await expect(run(listWorkerSessions(dependencies), ['missing'])).rejects.toThrow();

    expect(mocks.stdout).toEqual([]);
  });
});

describe('appendOrchestratorLog (src/commands/saga/runRecords.ts)', () => {
  const logPath = () => path.join(sagaDir, 'runtime', 'orchestrator-log.md');

  it('appends one collapsed log line and reports it as JSON', async () => {
    mocks.outputJson = true;

    await run(appendOrchestratorLog(dependencies), ['demo'], { message: '  first\n  line   two ' });

    const payload = JSON.parse(mocks.stdout[0]);
    expect(payload).toMatchObject({ sagaId: 'demo', command: 'log append', ok: true, path: logPath() });
    expect(payload.line).toMatch(/^- \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z \| first line two$/);
    expect(readFileSync(logPath(), 'utf8')).toBe(`${payload.line}\n`);
  });

  it('keeps earlier log content and adds a new line after it', async () => {
    await run(appendOrchestratorLog(dependencies), ['demo'], { message: 'one' });
    await run(appendOrchestratorLog(dependencies), ['demo'], { message: 'two' });

    const lines = readFileSync(logPath(), 'utf8').trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/\| one$/);
    expect(lines[1]).toMatch(/\| two$/);
  });

  it('creates runtime/ and the ignore rule when they are missing', async () => {
    await run(appendOrchestratorLog(dependencies), ['demo'], { message: 'hello' });

    expect(existsSync(path.join(sagaDir, 'runtime'))).toBe(true);
    expect(existsSync(logPath())).toBe(true);
  });

  it.each([
    ['missing', {}],
    ['not a string', { message: 42 }],
    ['empty', { message: '' }],
    ['blank', { message: '   \n ' }],
  ])('requires a nonblank message (%s) before any file access', async (_label, options) => {
    await expect(run(appendOrchestratorLog(dependencies), ['demo'], options)).rejects.toThrow(
      new CliUsageError('log append requires a nonblank --message <text>.'),
    );

    expect(mocks.stdout).toEqual([]);
    expect(existsSync(path.join(sagaDir, 'runtime'))).toBe(false);
  });

  it('refuses a write when a lock exists and the token does not match', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'));
    writeFileSync(
      path.join(sagaDir, 'runtime', 'execute.lock'),
      JSON.stringify({ token: 'right-token', ownerSession: 'owner-session', createdAt: '2026-11-11T00:00:00Z' }),
    );
    mocks.token = 'wrong-token';
    mocks.outputJson = true;

    const error = await run(appendOrchestratorLog(dependencies), ['demo'], { message: 'blocked' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CliSagaRefusalError);
    expect(JSON.parse(mocks.stdout[0])).toMatchObject({ command: 'log append', ok: false });
    expect(existsSync(logPath())).toBe(false);
  });

  it('allows the write when the lock token matches', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'));
    writeFileSync(
      path.join(sagaDir, 'runtime', 'execute.lock'),
      JSON.stringify({ token: 'right-token', ownerSession: 'owner-session', createdAt: '2026-11-11T00:00:00Z' }),
    );
    mocks.token = 'right-token';

    await run(appendOrchestratorLog(dependencies), ['demo'], { message: 'allowed' });

    expect(readFileSync(logPath(), 'utf8')).toMatch(/\| allowed\n$/);
  });

  it('refuses a log file that is a symlink out of the Saga root and leaves the target untouched', async () => {
    const outside = path.join(workspace, 'outside.md');
    writeFileSync(outside, 'secret\n');
    mkdirSync(path.join(sagaDir, 'runtime'));
    try {
      symlinkSync(outside, logPath());
    } catch {
      return;
    }
    mocks.outputJson = true;

    await expect(run(appendOrchestratorLog(dependencies), ['demo'], { message: 'x' })).rejects.toThrow();

    expect(readFileSync(outside, 'utf8')).toBe('secret\n');
  });
});

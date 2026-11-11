import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from './testHelpers';

const TOKEN = 'execution-token-under-test';
const RECORD_LINE = '- worker-1 | 2026-11-11T10:00:00Z | implementation | T1 | T1 implementation\n';

let workspace: string;
let projectPath: string;
let sagaDir: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-run-records-')));
  projectPath = path.join(workspace, 'Project');
  mkdirSync(projectPath);
  sagaDir = path.join(projectPath, '.hagicode', 'sagas', 'demo');
  mkdirSync(sagaDir, { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function writeLock(token: string): void {
  mkdirSync(path.join(sagaDir, 'runtime'), { recursive: true });
  writeFileSync(
    path.join(sagaDir, 'runtime', 'execute.lock'),
    JSON.stringify({ token, ownerSession: 'owner-session', createdAt: '2026-11-11T00:00:00Z' }),
  );
}

async function run(args: string[], env: Record<string, string | undefined> = {}) {
  const harness = createDependencies();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete harness.dependencies.env[key];
    } else {
      harness.dependencies.env[key] = value;
    }
  }
  const exitCode = await runCli(['node', 'hagi', 'saga', ...args], harness.dependencies);
  return { exitCode, stdout: harness.stdout.join(''), stderr: harness.stderr.join('') };
}

describe('saga session list', () => {
  it('lists the Worker records in file order as JSON, with item null for a dash', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'), { recursive: true });
    writeFileSync(
      path.join(sagaDir, 'runtime', 'sessions.md'),
      RECORD_LINE + '- worker-2 | 2026-11-11T10:05:00Z | verification | - | Verify the plan\n',
    );

    const result = await run(['session', 'list', 'demo', '--path', projectPath, '--json']);

    expect(result.exitCode).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload).toMatchObject({ sagaId: 'demo', command: 'session list', ok: true });
    expect(payload.sessions).toEqual([
      { sessionId: 'worker-1', createdAt: '2026-11-11T10:00:00Z', role: 'implementation', item: 'T1', title: 'T1 implementation' },
      { sessionId: 'worker-2', createdAt: '2026-11-11T10:05:00Z', role: 'verification', item: null, title: 'Verify the plan' },
    ]);
  });

  it('skips lines that are not record lines', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'), { recursive: true });
    writeFileSync(path.join(sagaDir, 'runtime', 'sessions.md'), '# Sessions\n' + RECORD_LINE);

    const payload = JSON.parse((await run(['session', 'list', 'demo', '--path', projectPath, '--json'])).stdout);

    expect(payload.sessions.map((record: { sessionId: string }) => record.sessionId)).toEqual(['worker-1']);
  });

  it('reports no records and creates no file when sessions.md is missing', async () => {
    const result = await run(['session', 'list', 'demo', '--path', projectPath, '--json']);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).sessions).toEqual([]);
    expect(existsSync(path.join(sagaDir, 'runtime'))).toBe(false);
  });

  it('prints the records as a table in the human view', async () => {
    mkdirSync(path.join(sagaDir, 'runtime'), { recursive: true });
    writeFileSync(path.join(sagaDir, 'runtime', 'sessions.md'), RECORD_LINE);

    const result = await run(['session', 'list', 'demo', '--path', projectPath]);

    expect(result.stdout).toContain('Session ID');
    expect(result.stdout).toContain('worker-1');
    expect(result.stdout).toContain('T1 implementation');
  });

  it('refuses a runtime directory that is a symbolic link outside the Saga, reading nothing from it', async () => {
    const outside = path.join(workspace, 'outside');
    mkdirSync(outside);
    writeFileSync(path.join(outside, 'sessions.md'), RECORD_LINE);
    symlinkSync(outside, path.join(sagaDir, 'runtime'));

    const result = await run(['session', 'list', 'demo', '--path', projectPath, '--json']);

    expect(result.exitCode).not.toBe(0);
    expect(result.stdout).not.toContain('worker-1');
  });

  it('exits 24 for an unknown Saga', async () => {
    const result = await run(['session', 'list', 'nobody', '--path', projectPath, '--json']);

    expect(result.exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });
});

describe('saga log append', () => {
  it('appends one line under the owner token and keeps earlier content', async () => {
    writeLock(TOKEN);
    mkdirSync(path.join(sagaDir, 'runtime'), { recursive: true });
    writeFileSync(path.join(sagaDir, 'runtime', 'orchestrator-log.md'), '- earlier | kept\n');

    const result = await run(
      ['log', 'append', 'demo', '--path', projectPath, '--message', 'dispatched T1', '--json'],
      { SAGA_EXECUTION_TOKEN: TOKEN },
    );

    expect(result.exitCode).toBe(0);
    const logText = readFileSync(path.join(sagaDir, 'runtime', 'orchestrator-log.md'), 'utf8');
    expect(logText.startsWith('- earlier | kept\n')).toBe(true);
    expect(logText).toMatch(/\n- \d{4}-\d{2}-\d{2}T[^|]+\| dispatched T1\n$/);
    expect(JSON.parse(result.stdout)).toMatchObject({ sagaId: 'demo', command: 'log append', ok: true });
  });

  it('collapses line breaks and whitespace runs into one line', async () => {
    writeLock(TOKEN);

    await run(
      ['log', 'append', 'demo', '--path', projectPath, '--message', 'first line\n\n  second   line'],
      { SAGA_EXECUTION_TOKEN: TOKEN },
    );

    const lines = readFileSync(path.join(sagaDir, 'runtime', 'orchestrator-log.md'), 'utf8').trimEnd().split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/\| first line second line$/);
  });

  it('refuses a wrong token with exit 1, appends nothing and creates no runtime file', async () => {
    writeLock(TOKEN);

    const result = await run(
      ['log', 'append', 'demo', '--path', projectPath, '--message', 'x'],
      { SAGA_EXECUTION_TOKEN: 'not-the-token' },
    );

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(existsSync(path.join(sagaDir, 'runtime', 'orchestrator-log.md'))).toBe(false);
  });

  it('refuses a redirected log file and appends nothing outside the Saga', async () => {
    writeLock(TOKEN);
    const outside = path.join(workspace, 'outside-log.md');
    writeFileSync(outside, 'before\n');
    mkdirSync(path.join(sagaDir, 'runtime'), { recursive: true });
    symlinkSync(outside, path.join(sagaDir, 'runtime', 'orchestrator-log.md'));

    const result = await run(
      ['log', 'append', 'demo', '--path', projectPath, '--message', 'escape'],
      { SAGA_EXECUTION_TOKEN: TOKEN },
    );

    expect(result.exitCode).not.toBe(0);
    expect(readFileSync(outside, 'utf8')).toBe('before\n');
  });

  it('refuses a blank message with exit 2 before any token or file check', async () => {
    const result = await run(['log', 'append', 'demo', '--path', projectPath, '--message', '   ']);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('log append requires a nonblank --message');
    expect(existsSync(path.join(sagaDir, 'runtime'))).toBe(false);
  });

  it('shows the appended line in the human result', async () => {
    writeLock(TOKEN);

    const result = await run(
      ['log', 'append', 'demo', '--path', projectPath, '--message', 'dispatched T1'],
      { SAGA_EXECUTION_TOKEN: TOKEN },
    );

    expect(result.stdout).toContain('logged: demo');
    expect(result.stdout).toContain('| dispatched T1');
  });
});

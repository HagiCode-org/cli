import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerHagiTaskGetCommand } from '../../src/commands/hagitask/get';
import { registerHagiTaskMessagesCommand } from '../../src/commands/hagitask/messages';
import { registerHagiTaskSchemaCommand } from '../../src/commands/hagitask/schema';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createMessageList, fakeWaitClock, sessionWithStatus } from './testHelpers';

const task = (...args: string[]) => ['node', 'hagi', 'hagitask', ...args];

describe('registerHagiTaskGetCommand / Messages / Schema', () => {
  it('export the registration functions the hagitask group calls', () => {
    expect(typeof registerHagiTaskGetCommand).toBe('function');
    expect(typeof registerHagiTaskMessagesCommand).toBe('function');
    expect(typeof registerHagiTaskSchemaCommand).toBe('function');
  });
});

describe('hagi hagitask get (registerHagiTaskGetCommand)', () => {
  it('reads the trimmed session id once and prints a human summary', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(task('get', '--session-id', '  hagitask-1 '), dependencies)).toBe(0);
    expect(api.getSession).toHaveBeenCalledExactlyOnceWith('hagitask-1');
    expect(stdout.join('')).not.toBe('');
  });

  it('prints the session under a session key as JSON, without a wait block, when not waiting', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(task('get', '--session-id', 'hagitask-1', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(Object.keys(body)).toEqual(['session']);
    expect(body.session.sessionId).toBe('session-1');
  });

  it('rejects a whitespace-only session id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(task('get', '--session-id', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--session-id is required.');
    expect(api.getSession).not.toHaveBeenCalled();
  });

  it('fails without --session-id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(task('get'), dependencies)).not.toBe(0);
    expect(api.getSession).not.toHaveBeenCalled();
  });

  it.each([
    [['--wait', '--timeout', 'abc'], '--timeout must be a whole number of seconds.'],
    [['--wait', '--timeout', '0'], '--timeout must be 1 second or more.'],
    [['--wait', '--interval', '1.5', '--timeout', '30'], '--interval must be a whole number of seconds.'],
    [['--wait', '--interval', '0', '--timeout', '30'], '--interval must be 1 second or more.'],
    [['--wait', '--grace', '-1'], '--grace must be a whole number of seconds.'],
    [['--grace', '5'], '--grace needs --wait.'],
  ])('rejects %j with a usage error before any network call', async (flags, message) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(task('get', '--session-id', 'hagitask-1', ...flags), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(message);
    expect(api.getSession).not.toHaveBeenCalled();
  });

  it('lists every wait-only flag given without --wait', async () => {
    const { dependencies, stderr } = createDependencies();

    expect(await runCli(task('get', '--session-id', 'hagitask-1', '--timeout', '9', '--grace', '1'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--timeout, --grace needs --wait.');
  });

  it('accepts a zero grace period with --wait', async () => {
    const { dependencies, api } = createDependencies();
    Object.assign(dependencies, fakeWaitClock());
    vi.mocked(api.getSession).mockResolvedValue(sessionWithStatus('hagitask-1', 'ExecutionCompleted', PCode_Models_SessionType.CHAT) as never);

    expect(await runCli(task('get', '--session-id', 'hagitask-1', '--wait', '--grace', '0'), dependencies)).toBe(0);
  });

  it('exits 31 and still prints the last status as JSON when the wait times out', async () => {
    const { dependencies, api, stdout } = createDependencies();
    Object.assign(dependencies, fakeWaitClock());
    vi.mocked(api.getSession).mockResolvedValue(sessionWithStatus('hagitask-1', 'Executing', PCode_Models_SessionType.CHAT) as never);

    expect(await runCli(task('get', '--session-id', 'hagitask-1', '--wait', '--timeout', '4', '--interval', '2', '--json'), dependencies)).toBe(
      EXIT_CODES.WAIT_TIMEOUT,
    );
    const body = JSON.parse(stdout.join(''));
    expect(body.session.status).toBe('Executing');
    expect(body.wait).toMatchObject({ settled: false, timedOut: true });
  });

  it('names the HagiTask session in the timeout message', async () => {
    const { dependencies, api, stderr } = createDependencies();
    Object.assign(dependencies, fakeWaitClock());
    vi.mocked(api.getSession).mockResolvedValue(sessionWithStatus('hagitask-1', 'Executing', PCode_Models_SessionType.CHAT) as never);

    await runCli(task('get', '--session-id', 'hagitask-1', '--wait', '--timeout', '4', '--interval', '2'), dependencies);

    expect(stderr.join('')).toContain('waiting for HagiTask session hagitask-1 to settle');
  });
});

describe('hagi hagitask messages (registerHagiTaskMessagesCommand)', () => {
  it('reads the backend default page, newest first, when --last is absent', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(task('messages', '--session-id', ' hagitask-1 '), dependencies)).toBe(0);
    expect(api.getSessionMessages).toHaveBeenCalledExactlyOnceWith('hagitask-1', { page: 1, order: 'desc' });
  });

  it('asks for exactly n messages with --last n', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(task('messages', '--session-id', 'hagitask-1', '--last', ' 3 '), dependencies)).toBe(0);
    expect(api.getSessionMessages).toHaveBeenCalledWith('hagitask-1', { page: 1, pageSize: 3, order: 'desc' });
  });

  it.each(['0', '-1', '1.5', 'abc', ''])('rejects --last %j before any network call', async value => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(task('messages', '--session-id', 'hagitask-1', '--last', value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--last must be a positive whole number.');
    expect(api.getSessionMessages).not.toHaveBeenCalled();
  });

  it('prints the backend message list unchanged as JSON', async () => {
    const list = createMessageList({ totalCount: 7 });
    const { dependencies, stdout } = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(list) });

    expect(await runCli(task('messages', '--session-id', 'hagitask-1', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(body.totalCount).toBe(7);
    expect(body.messages).toHaveLength(list.messages.length);
  });

  it('prints message text for a human reader', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(task('messages', '--session-id', 'hagitask-1'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Commits Created');
  });

  it('rejects a whitespace-only session id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(task('messages', '--session-id', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.getSessionMessages).not.toHaveBeenCalled();
  });
});

describe('hagi hagitask schema (registerHagiTaskSchemaCommand)', () => {
  it('reads the trimmed task id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(task('schema', '--task-id', '  compose-commit '), dependencies)).toBe(0);
    expect(api.getHagiTaskSchema).toHaveBeenCalledExactlyOnceWith('compose-commit');
  });

  it('rejects a whitespace-only task id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(task('schema', '--task-id', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--task-id is required.');
    expect(api.getHagiTaskSchema).not.toHaveBeenCalled();
  });

  it('lists diagnostics with fallbacks for a missing code, message and path', async () => {
    const { dependencies, stderr } = createDependencies({
      getHagiTaskSchema: vi.fn().mockRejectedValue(
        createApiError(404, { error: 'Task is off.', diagnostics: [{}, { code: 'X', message: 'why', path: 'a/b' }] }),
      ),
    });

    expect(await runCli(task('schema', '--task-id', 't'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    const out = stderr.join('');
    expect(out).toContain('Task is off.');
    expect(out).toContain('  - diagnostic: ');
    expect(out).toContain('  - X: why (a/b)');
  });

  it('uses a default message when the not-found body names none', async () => {
    const { dependencies, stderr } = createDependencies({
      getHagiTaskSchema: vi.fn().mockRejectedValue(createApiError(404, { diagnostics: [{ code: 'Y', message: 'm' }] })),
    });

    await runCli(task('schema', '--task-id', 'legacy'), dependencies);

    expect(stderr.join('')).toMatch(/Backend error|HagiTask legacy is not available\./);
    expect(stderr.join('')).toContain('  - Y: m');
  });

  it('leaves a not-found answer without diagnostics to the generic error mapping', async () => {
    const { dependencies, stderr } = createDependencies({
      getHagiTaskSchema: vi.fn().mockRejectedValue(createApiError(404, { error: 'No such task.' })),
    });

    expect(await runCli(task('schema', '--task-id', 'x'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stderr.join('')).toContain('No such task.');
    expect(stderr.join('')).not.toContain('  - ');
  });

  it('does not add diagnostics to errors other than not-found', async () => {
    const { dependencies, stderr } = createDependencies({
      getHagiTaskSchema: vi.fn().mockRejectedValue(createApiError(409, { error: 'Conflict.', diagnostics: [{ code: 'Z', message: 'zz' }] })),
    });

    expect(await runCli(task('schema', '--task-id', 'x'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stderr.join('')).not.toContain('Z: zz');
  });

  it('rethrows an unreachable backend unchanged', async () => {
    const { dependencies } = createDependencies({
      getHagiTaskSchema: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    expect(await runCli(task('schema', '--task-id', 'x'), dependencies)).not.toBe(0);
  });

  it('prints the full schema as JSON with --json', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(task('schema', '--task-id', 'compose-commit', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).id).toBe('compose-commit');
  });
});

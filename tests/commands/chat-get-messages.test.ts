import { describe, expect, it, vi } from 'vitest';
import { formatSessionSummaryHuman, toSessionView } from '../../src/formatters/session';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createMessage, createMessageList, createSession } from './testHelpers';

const chat = (...args: string[]) => ['node', 'hagi', 'chat', ...args];

describe('hagi chat get', () => {
  it('reads the explicit trimmed ID once and prints the shared session projection as { session }', async () => {
    const session = createSession('chat-1', PCode_Models_SessionType.CHAT);
    const made = createDependencies({ getSession: vi.fn().mockResolvedValue(session) });

    expect(await runCli(chat('get', '--session-id', ' chat-1 ', '--json'), made.dependencies)).toBe(0);
    expect(made.api.getSession).toHaveBeenCalledExactlyOnceWith('chat-1');
    expect(JSON.parse(made.stdout.join(''))).toEqual({ session: toSessionView(session) });
    for (const [name, method] of Object.entries(made.api)) {
      if (name !== 'getSession') expect(method).not.toHaveBeenCalled();
    }
  });

  it('prints the existing human session summary without polling or reading messages', async () => {
    const session = createSession('chat-1', PCode_Models_SessionType.CHAT);
    const made = createDependencies({ getSession: vi.fn().mockResolvedValue(session) });

    expect(await runCli(chat('get', '--session-id', 'chat-1'), made.dependencies)).toBe(0);
    expect(made.stdout.join('')).toBe(formatSessionSummaryHuman(toSessionView(session)));
    expect(made.api.getSession).toHaveBeenCalledTimes(1);
    expect(made.api.getSessionMessages).not.toHaveBeenCalled();
  });

  it.each(['--wait', '--timeout', '--interval', '--grace'])('does not expose %s', async flag => {
    const made = createDependencies();

    expect(await runCli(chat('get', '--session-id', 'chat-1', flag), made.dependencies)).toBe(EXIT_CODES.USAGE);
    for (const method of Object.values(made.api)) expect(method).not.toHaveBeenCalled();
  });
});

describe('hagi chat messages', () => {
  it('prints text and skipped-block counts using one read and no state-changing calls', async () => {
    const list = createMessageList({
      messages: [createMessage('m-1', [{ type: 'Text', text: 'Recovered task' }, { type: 'ToolUse' }])],
    });
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(list) });

    expect(await runCli(chat('messages', '--session-id', ' chat-1 '), made.dependencies)).toBe(0);
    expect(made.api.getSessionMessages).toHaveBeenCalledExactlyOnceWith('chat-1', { page: 1, order: 'desc' });
    expect(made.stdout.join('')).toContain('Recovered task');
    expect(made.stdout.join('')).toContain('(1 other block not shown)');
    for (const [name, method] of Object.entries(made.api)) {
      if (name !== 'getSessionMessages') expect(method).not.toHaveBeenCalled();
    }
  });

  it.each([false, true])('distinguishes empty history from failure (JSON: %s)', async json => {
    const list = createMessageList({ messages: [], totalCount: 0 });
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(list) });

    expect(await runCli(chat('messages', '--session-id', 'chat-1', ...(json ? ['--json'] : [])), made.dependencies)).toBe(0);
    if (json) {
      expect(JSON.parse(made.stdout.join(''))).toEqual(list);
    } else {
      expect(made.stdout.join('')).toBe('No messages found.\n');
    }
  });
});

describe.each(['get', 'messages'])('hagi chat %s read failures', command => {
  it.each([[[]], [['--session-id', '  ']]])('requires a nonblank ID before I/O: %j', async flags => {
    const made = createDependencies();

    expect(await runCli(chat(command, ...flags), made.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(made.stderr.join('')).toContain('--session-id');
    for (const method of Object.values(made.api)) expect(method).not.toHaveBeenCalled();
  });

  it.each([
    [createApiError(404, { error: 'Session missing' }), EXIT_CODES.HTTP_NOT_FOUND, 'Session missing'],
    [createApiError(401, { error: 'Authentication required' }), EXIT_CODES.HTTP_UNAUTHORIZED, 'Authentication required'],
    [createApiError(403, { error: 'Session forbidden' }), EXIT_CODES.HTTP_FORBIDDEN, 'Session forbidden'],
    [new TypeError('fetch failed'), EXIT_CODES.TRANSPORT, 'Cannot reach HagiCode backend'],
  ])('propagates %s without invented context or mutation', async (error, code, message) => {
    const method = command === 'get' ? 'getSession' : 'getSessionMessages';
    const made = createDependencies({ [method]: vi.fn().mockRejectedValue(error) });

    expect(await runCli(chat(command, '--session-id', 'chat-1'), made.dependencies)).toBe(code);
    expect(made.stderr.join('')).toContain(message);
    expect(made.stdout).toEqual([]);
    expect(made.api[method]).toHaveBeenCalledTimes(1);
    for (const [name, apiMethod] of Object.entries(made.api)) {
      if (name !== method) expect(apiMethod).not.toHaveBeenCalled();
    }
  });
});

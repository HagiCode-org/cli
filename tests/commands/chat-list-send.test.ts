import { describe, expect, it, vi } from 'vitest';
import { registerChatListCommand } from '../../src/commands/chat/list';
import { registerChatSendCommand } from '../../src/commands/chat/send';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../src/generated/api/models/PCode_Models_MessageMode';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from './testHelpers';

const chat = (...args: string[]) => ['node', 'hagi', 'chat', ...args];

describe('hagi chat list (registerChatListCommand)', () => {
  it('exports the registration function the chat group calls', () => {
    expect(typeof registerChatListCommand).toBe('function');
  });

  it('asks only for chat sessions and leaves every filter unset by default', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('list'), dependencies)).toBe(0);
    expect(api.listSessions).toHaveBeenCalledExactlyOnceWith({
      type: PCode_Models_SessionType.CHAT,
      projectId: undefined,
      projectIds: undefined,
      activeOnly: undefined,
      includeArchived: undefined,
    });
  });

  it('passes a trimmed project id and both boolean flags', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('list', '--project-id', '  project-1 ', '--active-only', '--include-archived'), dependencies)).toBe(0);
    expect(api.listSessions).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'project-1', activeOnly: true, includeArchived: true }),
    );
  });

  it('passes several project ids, dropping blank ones', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('list', '--project-ids', 'a', ' ', ' b '), dependencies)).toBe(0);
    expect(api.listSessions).toHaveBeenCalledWith(expect.objectContaining({ projectId: undefined, projectIds: ['a', 'b'] }));
  });

  it('treats a list of only blank project ids as no filter', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('list', '--project-ids', ' ', '  '), dependencies)).toBe(0);
    expect(api.listSessions).toHaveBeenCalledWith(expect.objectContaining({ projectIds: undefined }));
  });

  it('rejects --project-id together with --project-ids before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(chat('list', '--project-id', 'a', '--project-ids', 'b'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Use either --project-id or --project-ids, not both.');
    expect(api.listSessions).not.toHaveBeenCalled();
  });

  it('prints a table headed Chat sessions with the session id', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(chat('list'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Chat sessions (1)');
    expect(stdout.join('')).toContain('session-1');
  });

  it('says so when there are no chat sessions', async () => {
    const { dependencies, stdout } = createDependencies({ listSessions: vi.fn().mockResolvedValue({ sessions: [] }) });

    expect(await runCli(chat('list'), dependencies)).toBe(0);
    expect(stdout.join('')).toBe('No chat sessions found.\n');
  });

  it('prints a sessions array as JSON with --json', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(chat('list', '--json'), dependencies)).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed.sessions).toHaveLength(1);
    expect(parsed.sessions[0].sessionId).toBe('session-1');
  });
});

describe('hagi chat send (registerChatSendCommand)', () => {
  it('exports the registration function the chat group calls', () => {
    expect(typeof registerChatSendCommand).toBe('function');
  });

  it('sends the trimmed content to the trimmed session id without overrides', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('send', '--session-id', '  chat-1 ', '--content', '  hello  '), dependencies)).toBe(0);
    expect(api.sendMessage).toHaveBeenCalledExactlyOnceWith('chat-1', {
      content: 'hello',
      mode: undefined,
      executorType: undefined,
    });
    expect(api.steerSession).not.toHaveBeenCalled();
  });

  it('passes the mode and executor overrides', async () => {
    const { dependencies, api } = createDependencies();

    expect(
      await runCli(
        chat('send', '--session-id', 'chat-1', '--content', 'hi', '--mode', 'Edit', '--executor-type', 'CodexCli'),
        dependencies,
      ),
    ).toBe(0);
    expect(api.sendMessage).toHaveBeenCalledWith('chat-1', {
      content: 'hi',
      mode: PCode_Models_MessageMode.EDIT,
      executorType: PCode_Models_AIProviderType.CODEX_CLI,
    });
  });

  it('prints a human summary naming the session, message and overrides', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(chat('send', '--session-id', 'chat-1', '--content', 'hi', '--mode', 'Edit'), dependencies)).toBe(0);
    const out = stdout.join('');
    expect(out).toContain('Chat message sent');
    expect(out).toContain('chat-1');
    expect(out).toContain('Queued');
    expect(out).toContain('Edit');
  });

  it('prints the message, the requested overrides and the steer state as JSON', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(chat('send', '--session-id', 'chat-1', '--content', 'hi', '--mode', 'Edit', '--json'), dependencies)).toBe(0);
    const parsed = JSON.parse(stdout.join(''));
    expect(parsed).toMatchObject({
      sessionId: 'chat-1',
      message: 'Queued',
      requested: { mode: 'Edit' },
    });
    expect(parsed.steer).toBeDefined();
  });

  it('rejects whitespace-only content with a usage error before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(chat('send', '--session-id', 'chat-1', '--content', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--content is required.');
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it.each([
    ['--session-id', ['--content', 'hi']],
    ['--content', ['--session-id', 'chat-1']],
  ])('fails without %s and sends nothing', async (_missing, rest) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('send', ...rest), dependencies)).not.toBe(0);
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it.each([
    ['--mode', 'Sideways'],
    ['--executor-type', 'NoSuchExecutor'],
  ])('rejects an unknown %s value', async (flag, value) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('send', '--session-id', 'chat-1', '--content', 'hi', flag, value), dependencies)).not.toBe(0);
    expect(api.sendMessage).not.toHaveBeenCalled();
  });

  it('fails and prints no success text when the backend call fails', async () => {
    const { dependencies, stdout } = createDependencies({ sendMessage: vi.fn().mockRejectedValue(new Error('no session')) });

    expect(await runCli(chat('send', '--session-id', 'chat-1', '--content', 'hi'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

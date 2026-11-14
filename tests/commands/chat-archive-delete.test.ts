import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerChatCommands } from '../../src/commands/chat';
import { registerChatArchiveCommand } from '../../src/commands/chat/archive';
import { registerChatDeleteCommand } from '../../src/commands/chat/delete';
import { runCli } from '../../src/main';
import { createDependencies } from './testHelpers';

const chat = (...args: string[]) => ['node', 'hagi', 'chat', ...args];

describe('registerChatCommands (src/commands/chat.ts)', () => {
  it('adds a single chat group with all seven subcommands', () => {
    const { dependencies } = createDependencies();
    const program = new Command('hagi');

    registerChatCommands(program, dependencies);

    const group = program.commands.find(command => command.name() === 'chat');
    expect(program.commands.map(command => command.name())).toEqual(['chat']);
    expect(group?.description()).toBe('Manage normal chat sessions.');
    expect(group?.commands.map(command => command.name()).sort()).toEqual(['archive', 'create', 'delete', 'get', 'list', 'messages', 'send']);
  });

  it('makes no backend call while registering', () => {
    const { dependencies, api } = createDependencies();

    registerChatCommands(new Command('hagi'), dependencies);

    for (const method of ['listSessions', 'createChatSession', 'archiveChat', 'deleteSession', 'sendMessage'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });
});

describe('hagi chat archive (registerChatArchiveCommand)', () => {
  it('exports the registration function the chat group calls', () => {
    expect(typeof registerChatArchiveCommand).toBe('function');
  });

  it('archives through the dedicated chat endpoint and prints a human summary', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(chat('archive', '--session-id', 'chat-1'), dependencies)).toBe(0);
    expect(api.archiveChat).toHaveBeenCalledExactlyOnceWith('chat-1');
    expect(stdout.join('')).toBe('Chat archived\nsessionId  chat-1\nmessage    Archived\n');
  });

  it('prints only the session id and message as JSON with --json', async () => {
    const { dependencies, stdout } = createDependencies({
      archiveChat: vi.fn().mockResolvedValue({ message: 'Done', extra: 'ignored' }),
    });

    expect(await runCli(chat('archive', '--session-id', 'chat-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ sessionId: 'chat-1', message: 'Done' });
  });

  it('trims the session id before using it', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(chat('archive', '--session-id', '  chat-9  ', '--json'), dependencies)).toBe(0);
    expect(api.archiveChat).toHaveBeenCalledWith('chat-9');
    expect(JSON.parse(stdout.join('')).sessionId).toBe('chat-9');
  });

  it('fails without --session-id and calls nothing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('archive'), dependencies)).not.toBe(0);
    expect(api.archiveChat).not.toHaveBeenCalled();
  });

  it('fails when the backend call fails, and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      archiveChat: vi.fn().mockRejectedValue(new Error('not found')),
    });

    expect(await runCli(chat('archive', '--session-id', 'chat-1'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi chat delete (registerChatDeleteCommand)', () => {
  it('exports the registration function the chat group calls', () => {
    expect(typeof registerChatDeleteCommand).toBe('function');
  });

  it('deletes without the force flag and prints a human summary', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(chat('delete', '--session-id', 'chat-1'), dependencies)).toBe(0);
    expect(api.deleteSession).toHaveBeenCalledExactlyOnceWith('chat-1', false);
    expect(stdout.join('')).toBe('Chat deleted\nsessionId  chat-1\nmessage    Deleted\n');
  });

  it('prints deleted: true with the message as JSON with --json', async () => {
    const { dependencies, stdout } = createDependencies({
      deleteSession: vi.fn().mockResolvedValue({ message: 'Gone' }),
    });

    expect(await runCli(chat('delete', '--session-id', 'chat-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ sessionId: 'chat-1', deleted: true, message: 'Gone' });
  });

  it('trims the session id before using it', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('delete', '--session-id', '  chat-9  '), dependencies)).toBe(0);
    expect(api.deleteSession).toHaveBeenCalledWith('chat-9', false);
  });

  it('fails without --session-id and calls nothing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(chat('delete'), dependencies)).not.toBe(0);
    expect(api.deleteSession).not.toHaveBeenCalled();
  });

  it('fails when the backend call fails, and never claims the chat was deleted', async () => {
    const { dependencies, stdout } = createDependencies({
      deleteSession: vi.fn().mockRejectedValue(new Error('forbidden')),
    });

    expect(await runCli(chat('delete', '--session-id', 'chat-1', '--json'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

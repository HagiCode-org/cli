import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../src/generated/api/models/PCode_Models_MessageMode';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { createDependencies } from './testHelpers';

describe('chat commands', () => {
  it('lists and creates chat sessions with generated request mapping', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'chat', 'list', '--active-only', '--json'], dependencies)).toBe(0);
    expect(api.listSessions).toHaveBeenCalledWith({
      type: PCode_Models_SessionType.CHAT,
      projectId: undefined,
      projectIds: undefined,
      activeOnly: true,
      includeArchived: undefined,
    });

    expect(await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--executor-type', 'CodexCli', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.createChatSession).toHaveBeenCalledWith({
      title: 'Chat',
      projectId: 'project-1',
      heroId: undefined,
      executorType: PCode_Models_AIProviderType.CODEX_CLI,
    });
    expect(stdout.join('')).toContain('"sessionId": "chat-1"');
  });

  it('archives, deletes, and sends chat messages', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'chat', 'archive', '--session-id', 'chat-1', '--json'], dependencies)).toBe(0);
    expect(api.archiveChat).toHaveBeenCalledWith('chat-1');

    expect(await runCli(['node', 'hagi', 'chat', 'delete', '--session-id', 'chat-1', '--json'], dependencies)).toBe(0);
    expect(api.deleteSession).toHaveBeenCalledWith('chat-1', false);

    expect(await runCli(
      ['node', 'hagi', 'chat', 'send', '--session-id', 'chat-1', '--content', 'hello', '--mode', 'Edit', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.sendMessage).toHaveBeenCalledWith('chat-1', {
      content: 'hello',
      mode: PCode_Models_MessageMode.EDIT,
      executorType: undefined,
    });
    expect(stdout.join('')).toContain('"message": "Queued"');
  });
});

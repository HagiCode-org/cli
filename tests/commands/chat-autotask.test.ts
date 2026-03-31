import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../src/generated/api/models/PCode_Models_MessageMode';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from './testHelpers';

describe('chat and autotask commands', () => {
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

  it('creates autotask sessions with routing fields and sends follow-up messages', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(
      [
        'node', 'hagi', 'autotask', 'create',
        '--title', 'Auto',
        '--project-id', 'project-1',
        '--prompt-id', 'auto-compose-commit.en-US',
        '--repository-path', 'repos/cli',
        '--need-push',
        '--target-branch-mode', 'new-custom',
        '--target-branch-name', 'feature/cli',
        '--script-key', 'autotask.auto-compose-commit',
        '--hero-id', 'hero-1',
        '--json',
      ],
      dependencies,
    )).toBe(0);
    expect(api.createAutoTaskSession).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Auto',
      projectId: 'project-1',
      promptId: 'auto-compose-commit.en-US',
      repositoryPath: 'repos/cli',
      needPush: true,
      targetBranchMode: 'new-custom',
      targetBranchName: 'feature/cli',
      scriptKey: 'autotask.auto-compose-commit',
      heroId: 'hero-1',
    }));

    expect(await runCli(
      ['node', 'hagi', 'autotask', 'send', '--session-id', 'autotask-1', '--content', 'continue', '--executor-type', 'CodexCli', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.sendMessage).toHaveBeenCalledWith('autotask-1', {
      content: 'continue',
      mode: undefined,
      executorType: PCode_Models_AIProviderType.CODEX_CLI,
    });
    expect(stdout.join('')).toContain('"promptId": "auto-compose-commit.en-US"');
  });

  it('validates autotask branch options before transport', async () => {
    const { dependencies, api, stderr } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'autotask', 'create', '--title', 'Auto', '--project-id', 'project-1', '--prompt-id', 'auto-compose-commit.en-US', '--target-branch-name', 'feature/cli', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.createAutoTaskSession).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('target-branch-mode new-custom');
  });
});

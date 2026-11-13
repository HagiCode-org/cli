import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerChatCreateCommand } from '../../src/commands/chat/create';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createSession } from './testHelpers';

const create = (...args: string[]) => ['node', 'hagi', 'chat', 'create', ...args];
const baseArgs = ['--title', 'Chat', '--project-id', 'project-1'];

describe('hagi chat create (registerChatCreateCommand)', () => {
  describe('registration', () => {
    function register() {
      const { dependencies } = createDependencies();
      const parent = new Command('chat');
      registerChatCreateCommand(parent, dependencies);
      const command = parent.commands.find(candidate => candidate.name() === 'create');
      return { parent, command };
    }

    it('adds a single create subcommand with a description', () => {
      const { parent, command } = register();

      expect(parent.commands.map(candidate => candidate.name())).toEqual(['create']);
      expect(command?.description()).toBe('Create a normal chat session.');
    });

    it('makes --title and --project-id required and the rest optional', () => {
      const { command } = register();
      const optionByFlag = (flag: string) => command?.options.find(option => option.long === flag);

      expect(optionByFlag('--title')?.mandatory).toBe(true);
      expect(optionByFlag('--project-id')?.mandatory).toBe(true);
      for (const flag of ['--hero-id', '--executor-type', '--metadata', '--metadata-json', '--json']) {
        expect(optionByFlag(flag), flag).toBeDefined();
        expect(optionByFlag(flag)?.mandatory, flag).toBeFalsy();
      }
    });

    it('limits --executor-type to the known executor types', () => {
      const { command } = register();
      const executor = command?.options.find(option => option.long === '--executor-type');

      expect(executor?.argChoices).toEqual(Object.values(PCode_Models_AIProviderType));
      expect(executor?.argChoices).toContain('ClaudeCodeCli');
    });
  });

  describe('request', () => {
    it('sends the title and project id, with the optional fields left unset', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create(...baseArgs), dependencies)).toBe(0);
      expect(api.createChatSession).toHaveBeenCalledExactlyOnceWith({
        title: 'Chat',
        projectId: 'project-1',
        heroId: undefined,
        executorType: undefined,
      });
    });

    it('trims the title, the project id and the hero id', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create('--title', '  Padded title ', '--project-id', ' project-9 ', '--hero-id', '  hero-1 '), dependencies)).toBe(0);
      expect(api.createChatSession).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Padded title', projectId: 'project-9', heroId: 'hero-1' }),
      );
    });

    it('drops a blank hero id', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create(...baseArgs, '--hero-id', '   '), dependencies)).toBe(0);
      expect(api.createChatSession).toHaveBeenCalledWith(expect.objectContaining({ heroId: undefined }));
    });

    it('passes the executor override through unchanged', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create(...baseArgs, '--executor-type', PCode_Models_AIProviderType.CODEX_CLI), dependencies)).toBe(0);
      expect(api.createChatSession).toHaveBeenCalledWith(
        expect.objectContaining({ executorType: PCode_Models_AIProviderType.CODEX_CLI }),
      );
    });
  });

  describe('usage errors', () => {
    it.each([
      ['a missing --title', ['--project-id', 'project-1']],
      ['a missing --project-id', ['--title', 'Chat']],
      ['an unknown --executor-type', [...baseArgs, '--executor-type', 'NoSuchExecutor']],
    ])('exits with a usage error and makes no backend call for %s', async (_label, args) => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create(...args), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.createChatSession).not.toHaveBeenCalled();
    });

    it('rejects a blank title, naming the option', async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(create('--title', '   ', '--project-id', 'project-1'), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain('--title is required.');
      expect(api.createChatSession).not.toHaveBeenCalled();
    });

    it('rejects a blank project id, naming the option', async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(create('--title', 'Chat', '--project-id', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain('--project-id is required.');
      expect(api.createChatSession).not.toHaveBeenCalled();
    });
  });

  describe('output', () => {
    it('prints a confirmation and the session summary by default', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli(create(...baseArgs), dependencies)).toBe(0);
      const output = stdout.join('');
      expect(output.startsWith('Chat session created\n')).toBe(true);
      expect(output).toContain('sessionId');
      expect(output).toContain('chat-1');
      expect(output).toContain('project-1');
    });

    it('prints only the session view as JSON with --json', async () => {
      const { dependencies, stdout } = createDependencies({
        createChatSession: vi.fn().mockResolvedValue(createSession('chat-7', PCode_Models_SessionType.CHAT)),
      });

      expect(await runCli(create(...baseArgs, '--json'), dependencies)).toBe(0);
      const parsed = JSON.parse(stdout.join(''));
      expect(Object.keys(parsed)).toEqual(['session']);
      expect(parsed.session.sessionId).toBe('chat-7');
      expect(parsed.session.type).toBe(PCode_Models_SessionType.CHAT);
      expect(stdout.join('')).not.toContain('Chat session created');
    });
  });

  describe('backend failure', () => {
    it('reports the backend message with its exit code and prints no success text', async () => {
      const { dependencies, stdout, stderr } = createDependencies({
        createChatSession: vi.fn().mockRejectedValue(createApiError(404, { error: 'Project not found.' })),
      });

      expect(await runCli(create(...baseArgs), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
      expect(stderr.join('')).toContain('Project not found.');
      expect(stdout.join('')).not.toContain('Chat session created');
    });
  });
});

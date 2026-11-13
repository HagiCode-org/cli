import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerHagiTaskAnswerCommand } from '../../src/commands/hagitask/answer';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createMessage, createMessageList } from './testHelpers';

function register() {
  const { dependencies, api, stdout, stderr } = createDependencies();
  const parent = new Command('hagitask');
  registerHagiTaskAnswerCommand(parent, dependencies);
  const command = parent.commands.find(candidate => candidate.name() === 'answer');
  return { parent, command, api, stdout, stderr };
}

describe('hagi hagitask answer (registerHagiTaskAnswerCommand)', () => {
  describe('registration', () => {
    it('adds a single answer subcommand', () => {
      const { parent, command } = register();

      expect(parent.commands.map(candidate => candidate.name())).toEqual(['answer']);
      expect(command).toBeDefined();
    });

    it('describes the command as changing HagiTask session state', () => {
      const { command } = register();

      expect(command?.description()).toContain('Answer the pending question of a HagiTask session.');
      expect(command?.description()).toContain('Changes session state');
    });

    it('requires --session-id and offers the shared answer options', () => {
      const { command } = register();
      const flags = command?.options.map(option => option.long) ?? [];

      expect(command?.options.filter(option => option.mandatory).map(option => option.long)).toEqual(['--session-id']);
      expect(flags).toEqual(expect.arrayContaining(['--session-id', '--option', '--text', '--question', '--input', '--reject', '--json']));
    });
  });

  describe('behavior through the hagitask group', () => {
    const answer = (...args: string[]) => ['node', 'hagi', 'hagitask', 'answer', ...args];

    it('exits with a usage error when --session-id is missing', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(answer('--option', '1'), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.getSessionMessages).not.toHaveBeenCalled();
    });

    it('exits with a usage error before any request when no answer is given', async () => {
      const { dependencies, api } = createDependencies({
        answerSessionQuestion: vi.fn(),
        answerSessionQuestions: vi.fn(),
      });

      expect(await runCli(answer('--session-id', 's-1'), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.getSessionMessages).not.toHaveBeenCalled();
      expect(api.answerSessionQuestion).not.toHaveBeenCalled();
      expect(api.answerSessionQuestions).not.toHaveBeenCalled();
    });

    it('reads the newest page of messages once and points to hagitask messages when nothing is pending', async () => {
      const { dependencies, api, stderr } = createDependencies({
        getSessionMessages: vi.fn().mockResolvedValue(
          createMessageList({ messages: [createMessage('m-1', [{ type: 'Text', text: 'Done.' }])] }),
        ),
        answerSessionQuestion: vi.fn(),
        answerSessionQuestions: vi.fn(),
      });

      expect(await runCli(answer('--session-id', 's-1', '--option', '1'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
      expect(api.getSessionMessages).toHaveBeenCalledExactlyOnceWith('s-1', { page: 1, order: 'desc' });
      expect(stderr.join('')).toContain('No pending question in session s-1.');
      expect(stderr.join('')).toContain('hagi hagitask messages --session-id s-1');
      expect(stderr.join('')).not.toContain('hagi proposal messages');
      expect(api.answerSessionQuestion).not.toHaveBeenCalled();
      expect(api.answerSessionQuestions).not.toHaveBeenCalled();
    });
  });
});

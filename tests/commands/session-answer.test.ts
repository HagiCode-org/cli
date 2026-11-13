import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { EXIT_CODES } from '../../src/runtime/errors';
import { runCli } from '../../src/main';
import type { PCode_Models_MessageUserQuestionDto, PCode_Models_MessageUserQuestionItemDto } from '../../src/generated/api/models/PCode_Models_MessageUserQuestionDto';
import { createDependencies, createMessage, createMessageList, fakeWaitClock, sessionWithStatus } from './testHelpers';

const QUESTION_TEXT = 'Which environment should the migration run in?';
const SECOND_TEXT = 'Which checks should run before the merge?';

function item(overrides: Partial<PCode_Models_MessageUserQuestionItemDto> = {}): PCode_Models_MessageUserQuestionItemDto {
  return {
    question: QUESTION_TEXT,
    header: 'Deployment target',
    multiSelect: false,
    options: [
      { label: 'staging', description: 'safe to repeat' },
      { label: 'production', description: 'needs a maintenance window' },
    ],
    allowCustomAnswer: false,
    isSecret: false,
    ...overrides,
  };
}

function question(
  questions: PCode_Models_MessageUserQuestionItemDto[] = [item()],
  overrides: Partial<PCode_Models_MessageUserQuestionDto> = {},
): PCode_Models_MessageUserQuestionDto {
  return {
    questionId: 'q-1',
    state: 'pending',
    questions,
    limits: { maxAnswerLength: 200, maxValuesPerQuestion: 20 },
    ...overrides,
  };
}

/** A message list whose newest message carries a pending question, the shape `GetSessionMessages` returns. */
function pendingList(questions?: PCode_Models_MessageUserQuestionItemDto[], overrides: Partial<PCode_Models_MessageUserQuestionDto> = {}) {
  return createMessageList({
    messages: [
      { ...createMessage('m-2', [{ type: 'Text', text: 'Please choose.' }]), userQuestion: question(questions, overrides) } as never,
      createMessage('m-1', [{ type: 'Text', text: 'Earlier.' }]),
    ],
  });
}

function noQuestionList() {
  return createMessageList({ messages: [createMessage('m-1', [{ type: 'Text', text: 'Done.' }])] });
}

function accepted(outcome = 'delivered', state = 'answered') {
  return { outcome, state };
}

describe('answer command', () => {
  it('answers the pending question with one AnswerSessionQuestion call and prints the outcome as JSON', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn().mockResolvedValue(accepted()),
      answerSessionQuestions: vi.fn(),
    });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', '1', '--json'], made.dependencies);

    expect(exitCode).toBe(0);
    expect(made.api.getSessionMessages).toHaveBeenCalledTimes(1);
    expect(made.api.answerSessionQuestion).toHaveBeenCalledTimes(1);
    expect(made.api.answerSessionQuestion).toHaveBeenCalledWith('s-1', {
      messageId: 'm-2',
      questionId: 'q-1',
      answers: [{ question: QUESTION_TEXT, values: ['staging'] }],
    });
    expect(made.api.answerSessionQuestions).not.toHaveBeenCalled();
    expect(JSON.parse(made.stdout.join(''))).toEqual({
      sessionId: 's-1',
      messageId: 'm-2',
      results: [{ questionId: 'q-1', outcome: 'delivered', state: 'answered' }],
    });
  });

  it('prints one human line per result', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn().mockResolvedValue(accepted()),
    });

    expect(await runCli(['node', 'hagi', 'hagitask', 'answer', '--session-id', 's-1', '--option', 'staging'], made.dependencies)).toBe(0);
    expect(made.stdout.join('')).toContain('Question q-1: delivered; the question is now answered');
  });

  it('exits with the not-found code and sends nothing when no question is pending', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(noQuestionList()),
      answerSessionQuestion: vi.fn(),
    });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', '1'], made.dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(made.api.answerSessionQuestion).not.toHaveBeenCalled();
    expect(made.stderr.join('')).toContain('No pending question in session s-1');
  });

  it('refuses a missing session id and a conflicting flag before any network call', async () => {
    const made = createDependencies({ getSessionMessages: vi.fn(), answerSessionQuestion: vi.fn() });
    const input = join(await mkdtemp(join(tmpdir(), 'hagi-answer-')), 'answers.json');
    await writeFile(input, '{"answers":[]}');

    expect(await runCli(['node', 'hagi', 'proposal', 'answer', '--option', '1'], made.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--input', input, '--option', '1'], made.dependencies)).toBe(EXIT_CODES.USAGE);
    expect(made.api.getSessionMessages).not.toHaveBeenCalled();
    expect(made.api.answerSessionQuestion).not.toHaveBeenCalled();
  });

  it('refuses an unknown option with the invalid-answer code and sends nothing', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn(),
    });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', '9'], made.dependencies);

    expect(exitCode).toBe(EXIT_CODES.QUESTION_INVALID_ANSWER);
    expect(made.api.answerSessionQuestion).not.toHaveBeenCalled();
    expect(made.stderr.join('')).toContain('option "9" is not one of the question\'s options');
  });

  it('answers every question of a prompt in one AnswerSessionQuestions call read from --input', async () => {
    const questions = [item(), item({ question: SECOND_TEXT, multiSelect: true, options: [{ label: 'unit', description: '' }, { label: 'e2e', description: '' }] })];
    const dir = await mkdtemp(join(tmpdir(), 'hagi-answer-'));
    const file = join(dir, 'answers.json');
    await writeFile(file, JSON.stringify({
      answers: [
        { question: 1, options: ['production'] },
        { question: 2, options: ['e2e', 'unit'] },
      ],
    }));
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList(questions)),
      answerSessionQuestion: vi.fn(),
      answerSessionQuestions: vi.fn().mockResolvedValue({
        status: 'completed',
        items: [{ messageId: 'm-2', questionId: 'q-1', outcome: 'resumed', state: 'answered' }],
      }),
    });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--input', file, '--json'], made.dependencies);

    expect(exitCode).toBe(0);
    expect(made.api.answerSessionQuestion).not.toHaveBeenCalled();
    expect(made.api.answerSessionQuestions).toHaveBeenCalledTimes(1);
    expect(made.api.answerSessionQuestions).toHaveBeenCalledWith('s-1', [{
      messageId: 'm-2',
      questionId: 'q-1',
      answers: [
        { question: QUESTION_TEXT, values: ['production'] },
        { question: SECOND_TEXT, values: ['e2e', 'unit'] },
      ],
    }]);
  });

  it('refuses a multi-question prompt that is answered with flags for one question only', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList([item(), item({ question: SECOND_TEXT })])),
      answerSessionQuestions: vi.fn(),
    });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', '1'], made.dependencies);

    expect(exitCode).toBe(EXIT_CODES.QUESTION_INVALID_ANSWER);
    expect(made.api.answerSessionQuestions).not.toHaveBeenCalled();
    expect(made.stderr.join('')).toContain('question 2 has no answer');
  });

  it('collects repeated --option values for a multi-select question, in the order given', async () => {
    const multi = [item({ multiSelect: true, options: [{ label: 'unit', description: '' }, { label: 'e2e', description: '' }, { label: 'lint', description: '' }] })];
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList(multi)),
      answerSessionQuestion: vi.fn().mockResolvedValue(accepted()),
    });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', 'lint', '--option', '1'], made.dependencies);

    expect(exitCode).toBe(0);
    expect(made.api.answerSessionQuestion).toHaveBeenCalledWith('s-1', expect.objectContaining({
      answers: [{ question: QUESTION_TEXT, values: ['lint', 'unit'] }],
    }));
  });

  it('maps an already-answered outcome to its exit code and reports the state', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn().mockResolvedValue({ outcome: 'already-answered', state: 'answered' }),
    });

    const exitCode = await runCli(['node', 'hagi', 'hagitask', 'answer', '--session-id', 's-1', '--option', '1', '--json'], made.dependencies);

    expect(exitCode).toBe(EXIT_CODES.QUESTION_ALREADY_ANSWERED);
    expect(JSON.parse(made.stdout.join(''))).toMatchObject({ results: [{ outcome: 'already-answered', state: 'answered' }] });
  });

  it('maps a backend not-found outcome to the existing not-found code', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn().mockResolvedValue({ outcome: 'not-found' }),
    });

    expect(await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', '1'], made.dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });

  it('reports the backend reason of an invalid answer and exits with the invalid-answer code', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn().mockResolvedValue({ outcome: 'invalid', state: 'pending', reason: 'too-long' }),
    });

    expect(await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--option', '1'], made.dependencies)).toBe(EXIT_CODES.QUESTION_INVALID_ANSWER);
    expect(made.stderr.join('')).toContain('invalid (too-long)');
  });

  it('sends a rejection as rejected with no option or text', async () => {
    const made = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
      answerSessionQuestion: vi.fn().mockResolvedValue(accepted('resumed')),
    });

    await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--reject'], made.dependencies);

    expect(made.api.answerSessionQuestion).toHaveBeenCalledWith('s-1', expect.objectContaining({
      answers: [{ question: QUESTION_TEXT, values: [], rejected: true }],
    }));
  });

  describe('secret answers', () => {
    const secretQuestions = [item({ allowCustomAnswer: true, isSecret: true })];
    const SECRET_VALUE = 'correct-horse-battery';

    it('sends a secret answer but never prints it, in the output, the JSON or an error', async () => {
      const made = createDependencies({
        getSessionMessages: vi.fn().mockResolvedValue(pendingList(secretQuestions)),
        answerSessionQuestion: vi.fn().mockResolvedValue(accepted()),
      });

      const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--text', SECRET_VALUE, '--json'], made.dependencies);

      expect(exitCode).toBe(0);
      expect(made.api.answerSessionQuestion).toHaveBeenCalledWith('s-1', expect.objectContaining({
        answers: [{ question: QUESTION_TEXT, values: [SECRET_VALUE] }],
      }));
      expect(made.stdout.join('')).not.toContain(SECRET_VALUE);
      expect(made.stderr.join('')).not.toContain(SECRET_VALUE);
    });

    it('names only the rule when a secret answer fails a check', async () => {
      const made = createDependencies({
        getSessionMessages: vi.fn().mockResolvedValue(pendingList([item({ isSecret: true, allowCustomAnswer: false })])),
        answerSessionQuestion: vi.fn(),
      });

      const exitCode = await runCli(['node', 'hagi', 'proposal', 'answer', '--session-id', 's-1', '--text', SECRET_VALUE], made.dependencies);

      expect(exitCode).toBe(EXIT_CODES.QUESTION_INVALID_ANSWER);
      expect(made.api.answerSessionQuestion).not.toHaveBeenCalled();
      expect(made.stderr.join('')).toContain('a custom answer is not allowed for this question');
      expect(made.stderr.join('')).not.toContain(SECRET_VALUE);
    });
  });
});

describe('messages --pending-question', () => {
  it('prints only the pending question from the same read, in human form', async () => {
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(pendingList()) });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'messages', '--session-id', 's-1', '--pending-question'], made.dependencies);

    expect(exitCode).toBe(0);
    expect(made.api.getSessionMessages).toHaveBeenCalledTimes(1);
    const output = made.stdout.join('');
    expect(output).toContain('Pending question on message m-2');
    expect(output).toContain(QUESTION_TEXT);
    expect(output).toContain('1. staging');
    expect(output).not.toContain('Please choose.');
  });

  it('prints the pending question as JSON with the message id', async () => {
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(pendingList()) });

    await runCli(['node', 'hagi', 'hagitask', 'messages', '--session-id', 's-1', '--pending-question', '--json'], made.dependencies);

    const parsed = JSON.parse(made.stdout.join(''));
    expect(parsed).toMatchObject({ sessionId: 's-1', messageId: 'm-2', userQuestion: { questionId: 'q-1', state: 'pending' } });
  });

  it('exits with the not-found code when no question is pending', async () => {
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(noQuestionList()) });

    expect(await runCli(['node', 'hagi', 'proposal', 'messages', '--session-id', 's-1', '--pending-question'], made.dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(made.stderr.join('')).toContain('No pending question in session s-1.');
  });

  it('shows "answer hidden" for an answered secret question and never its value', async () => {
    const SECRET = 'swordfish';
    const list = createMessageList({
      messages: [{
        ...createMessage('m-2', []),
        userQuestion: question([item({ isSecret: true, allowCustomAnswer: true })], {
          state: 'answered',
          answers: [{ question: QUESTION_TEXT, values: ['[redacted]'] }],
          answeredAt: '2026-11-02T10:05:00Z',
        }),
      } as never],
    });
    const made = createDependencies({ getSessionMessages: vi.fn().mockResolvedValue(list) });

    await runCli(['node', 'hagi', 'proposal', 'messages', '--session-id', 's-1', '--json'], made.dependencies);
    const json = made.stdout.join('');
    expect(json).not.toContain(SECRET);

    made.stdout.length = 0;
    await runCli(['node', 'hagi', 'proposal', 'messages', '--session-id', 's-1'], made.dependencies);
    expect(made.stdout.join('')).toContain('answer hidden');
    expect(made.stdout.join('')).not.toContain(SECRET);
  });
});

describe('proposal get --wait at WaitingForReply', () => {
  function waitDependencies(overrides: Parameters<typeof createDependencies>[0] = {}) {
    const made = createDependencies({
      getSession: vi.fn().mockResolvedValue(sessionWithStatus('s-1', 'WaitingForReply')),
      ...overrides,
    });
    Object.assign(made.dependencies, fakeWaitClock());
    return made;
  }

  it('prints the pointer to the pending question and both follow-up commands, with the safety line', async () => {
    const made = waitDependencies({ getSessionMessages: vi.fn().mockResolvedValue(pendingList()) });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'get', '--session-id', 's-1', '--wait', '--grace', '0'], made.dependencies);

    expect(exitCode).toBe(0);
    const output = made.stdout.join('');
    expect(output).toContain('a person must answer');
    expect(output).toContain('Pending question: 1 question, id q-1, on message m-2');
    expect(output).toContain('hagi proposal messages --session-id s-1 --pending-question');
    expect(output).toContain('hagi proposal answer --session-id s-1');
    expect(output).toContain('An agent answers only on an explicit user request or an explicit Saga instruction.');
  });

  it('adds wait.pendingQuestion to the JSON, and the five existing wait fields stay unchanged', async () => {
    const made = waitDependencies({ getSessionMessages: vi.fn().mockResolvedValue(pendingList()) });

    await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 's-1', '--wait', '--grace', '0', '--json'], made.dependencies);

    const wait = JSON.parse(made.stdout.join('')).wait;
    expect(Object.keys(wait).sort()).toEqual(['elapsedSeconds', 'pendingQuestion', 'polls', 'settled', 'timedOut', 'transitionSeen'].sort());
    expect(wait.pendingQuestion).toEqual({ messageId: 'm-2', questionId: 'q-1', state: 'pending', questionCount: 1 });
    expect(wait).toMatchObject({ settled: true, timedOut: false });
  });

  it('says that no pending question was found and still settles successfully', async () => {
    const made = waitDependencies({ getSessionMessages: vi.fn().mockResolvedValue(noQuestionList()) });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'get', '--session-id', 's-1', '--wait', '--grace', '0'], made.dependencies);

    expect(exitCode).toBe(0);
    expect(made.stdout.join('')).toContain('No pending question was found.');
  });

  it('keeps the wait successful when the extra read of the messages fails', async () => {
    const made = waitDependencies({ getSessionMessages: vi.fn().mockRejectedValue(new Error('network down')) });

    const exitCode = await runCli(['node', 'hagi', 'proposal', 'get', '--session-id', 's-1', '--wait', '--grace', '0', '--json'], made.dependencies);

    expect(exitCode).toBe(0);
    const parsed = JSON.parse(made.stdout.join(''));
    expect(parsed.wait.settled).toBe(true);
    expect(parsed.wait).not.toHaveProperty('pendingQuestion');
  });

  it('reads the messages only at WaitingForReply', async () => {
    const made = createDependencies({
      getSession: vi.fn().mockResolvedValue(sessionWithStatus('s-1', 'Reviewing')),
      getSessionMessages: vi.fn().mockResolvedValue(pendingList()),
    });
    Object.assign(made.dependencies, fakeWaitClock());

    await runCli(['node', 'hagi', 'proposal', 'get', '--session-id', 's-1', '--wait', '--grace', '0', '--json'], made.dependencies);

    expect(made.api.getSessionMessages).not.toHaveBeenCalled();
    expect(JSON.parse(made.stdout.join('')).wait).not.toHaveProperty('pendingQuestion');
  });
});

import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PCode_Models_MessageUserQuestionDto, PCode_Models_MessageUserQuestionItemDto } from '../../src/generated/api/models/PCode_Models_MessageUserQuestionDto';
import { CliUsageError, EXIT_CODES } from '../../src/runtime/errors';
import {
  checkAnswer,
  checkPromptAnswers,
  exitCodeForOutcome,
  exitCodeForResults,
  findPendingQuestion,
  readAnswerRequest,
  summarizePendingQuestion,
  type AnswerEntry,
  type PendingQuestion,
} from '../../src/runtime/questionAnswers';

const LIMITS = { maxAnswerLength: 20, maxValuesPerQuestion: 2 };

function item(overrides: Partial<PCode_Models_MessageUserQuestionItemDto> = {}): PCode_Models_MessageUserQuestionItemDto {
  return {
    question: 'Which environment should the migration run in?',
    header: 'Deployment target',
    multiSelect: false,
    options: [
      { label: 'staging', description: 'safe to repeat' },
      { label: 'production', description: 'needs a maintenance window' },
    ],
    allowCustomAnswer: true,
    isSecret: false,
    ...overrides,
  };
}

function prompt(questions: PCode_Models_MessageUserQuestionItemDto[] = [item()], state = 'pending'): PCode_Models_MessageUserQuestionDto {
  return { questionId: 'q-1', state, questions, limits: LIMITS };
}

function pending(questions?: PCode_Models_MessageUserQuestionItemDto[]): PendingQuestion {
  return { messageId: 'm-2', userQuestion: prompt(questions) };
}

function entry(overrides: Partial<AnswerEntry> = {}): AnswerEntry {
  return { question: 1, options: [], texts: [], reject: false, ...overrides };
}

describe('findPendingQuestion', () => {
  it('returns the first (newest) message whose question is pending', () => {
    const found = findPendingQuestion([
      { id: 'm-3', userQuestion: prompt([item()], 'answered') },
      { id: 'm-2', userQuestion: prompt([item()], 'pending') },
      { id: 'm-1', userQuestion: prompt([item()], 'pending') },
    ]);

    expect(found?.messageId).toBe('m-2');
  });

  it('returns undefined when no question is pending or the messages carry none', () => {
    expect(findPendingQuestion([{ id: 'm-1' }, { id: 'm-2', userQuestion: prompt([item()], 'expired') }])).toBeUndefined();
  });

  it('summarizes the pending question without any answer value', () => {
    expect(summarizePendingQuestion(pending([item(), item({ question: 'Which checks?' })]))).toEqual({
      messageId: 'm-2',
      questionId: 'q-1',
      state: 'pending',
      questionCount: 2,
    });
  });
});

describe('exitCodeForOutcome', () => {
  it.each([
    ['delivered', 0],
    ['resumed', 0],
    ['already-answered', EXIT_CODES.QUESTION_ALREADY_ANSWERED],
    ['cancelled', EXIT_CODES.QUESTION_ALREADY_ANSWERED],
    ['not-found', EXIT_CODES.HTTP_NOT_FOUND],
    ['invalid', EXIT_CODES.QUESTION_INVALID_ANSWER],
    ['failed', EXIT_CODES.QUESTION_INVALID_ANSWER],
    ['a-value-added-later', EXIT_CODES.QUESTION_INVALID_ANSWER],
  ])('maps %s to exit code %s', (outcome, code) => {
    expect(exitCodeForOutcome(outcome)).toBe(code);
  });

  it('never maps an unknown outcome to success', () => {
    expect(exitCodeForOutcome('')).not.toBe(0);
  });
});

describe('exitCodeForResults', () => {
  it('is 0 when every item was accepted', () => {
    expect(exitCodeForResults([{ outcome: 'delivered' }, { outcome: 'resumed' }])).toBe(0);
  });

  it('uses the code of the first item, in question order, that was not accepted', () => {
    expect(exitCodeForResults([{ outcome: 'delivered' }, { outcome: 'invalid' }, { outcome: 'already-answered' }]))
      .toBe(EXIT_CODES.QUESTION_INVALID_ANSWER);
    expect(exitCodeForResults([{ outcome: 'already-answered' }, { outcome: 'invalid' }]))
      .toBe(EXIT_CODES.QUESTION_ALREADY_ANSWERED);
  });
});

describe('readAnswerRequest', () => {
  it.each([
    [{ input: '/no/such/file.json', option: ['1'] }, '--input cannot be combined with --option.'],
    [{ input: '/no/such/file.json', text: ['x'] }, '--input cannot be combined with --text.'],
    [{ input: '/no/such/file.json', question: '2' }, '--input cannot be combined with --question.'],
    [{ input: '/no/such/file.json', reject: true }, '--input cannot be combined with --reject.'],
    [{ reject: true, option: ['1'] }, '--reject cannot be combined with --option or --text.'],
    [{ reject: true, text: ['x'] }, '--reject cannot be combined with --option or --text.'],
    [{}, 'Give an answer with --option, --text, --input or --reject.'],
  ])('refuses the conflicting flags %j before any file or network use', async (flags, message) => {
    const failure = readAnswerRequest(flags);
    await expect(failure).rejects.toBeInstanceOf(CliUsageError);
    await expect(failure).rejects.toThrow(message);
  });

  it('reads a numeric --option as a 1-based index and a label as a label', async () => {
    const request = await readAnswerRequest({ option: ['2', 'staging'] });

    expect(request.entries).toEqual([{ question: 1, options: [2, 'staging'], texts: [], reject: false }]);
  });

  it('addresses the question given by --question, default 1', async () => {
    expect((await readAnswerRequest({ option: ['1'], question: '3' })).entries[0].question).toBe(3);
    await expect(readAnswerRequest({ option: ['1'], question: '0' })).rejects.toThrow('--question must be a positive whole number.');
  });

  it('reads a JSON document with positions, labels, indexes and text', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hagi-answers-'));
    const file = join(dir, 'answers.json');
    await writeFile(file, JSON.stringify({
      answers: [
        { question: 1, options: ['staging'], text: [] },
        { question: 'Which checks should run?', options: [2, '1'], text: ['  extra  '], reject: false },
      ],
    }));

    const request = await readAnswerRequest({ input: file });

    expect(request.entries).toEqual([
      { question: 1, options: ['staging'], texts: [], reject: false },
      { question: 'Which checks should run?', options: [2, '1'], texts: ['extra'], reject: false },
    ]);
  });

  it.each([
    ['not an object', '[]'],
    ['an empty answers list', '{"answers":[]}'],
    ['an unknown key', '{"answers":[{"question":1,"option":["a"]}]}'],
    ['a bad question', '{"answers":[{"question":0}]}'],
    ['bad options', '{"answers":[{"question":1,"options":"staging"}]}'],
    ['bad text', '{"answers":[{"question":1,"text":"x"}]}'],
    ['a non-boolean reject', '{"answers":[{"question":1,"reject":"yes"}]}'],
  ])('refuses a document with %s as a usage error', async (_label, body) => {
    const dir = await mkdtemp(join(tmpdir(), 'hagi-answers-'));
    const file = join(dir, 'bad.json');
    await writeFile(file, body);

    await expect(readAnswerRequest({ input: file })).rejects.toBeInstanceOf(CliUsageError);
  });
});

describe('checkAnswer', () => {
  it('accepts a valid option label', () => {
    const check = checkAnswer(item(), LIMITS, entry({ options: ['staging'] }));

    expect(check).toEqual({ ok: true, answer: { question: item().question, values: ['staging'] } });
  });

  it('names the unknown option of a non-secret question', () => {
    const check = checkAnswer(item(), LIMITS, entry({ options: [9] }));

    expect(check.ok).toBe(false);
    expect(!check.ok && check.violations.join(' ')).toContain('option "9" is not one of the question\'s options');
  });

  it('names no value for an unknown option of a secret question', () => {
    const secret = item({ isSecret: true, allowCustomAnswer: false });
    const check = checkAnswer(secret, LIMITS, entry({ options: ['hunter2-value'] }));

    expect(check.ok).toBe(false);
    expect(!check.ok && check.violations.join(' ')).not.toContain('hunter2-value');
  });

  it('refuses more than one value for a single-choice question', () => {
    const check = checkAnswer(item(), LIMITS, entry({ options: ['staging', 'production'] }));

    expect(!check.ok && check.violations).toEqual(['a single-choice question takes exactly one answer']);
  });

  it('allows a multi-select question up to its limit and refuses more', () => {
    const multi = item({ multiSelect: true, options: [{ label: 'a', description: '' }, { label: 'b', description: '' }, { label: 'c', description: '' }] });

    expect(checkAnswer(multi, LIMITS, entry({ options: ['a', 'b'] })).ok).toBe(true);
    const tooMany = checkAnswer(multi, LIMITS, entry({ options: ['a', 'b', 'c'] }));
    expect(!tooMany.ok && tooMany.violations.join(' ')).toContain('at most 2 answers');
  });

  it('refuses custom text when the question does not allow it', () => {
    const check = checkAnswer(item({ allowCustomAnswer: false }), LIMITS, entry({ texts: ['hello'] }));

    expect(!check.ok && check.violations).toEqual(['a custom answer is not allowed for this question']);
  });

  it('refuses an answer longer than the limit without echoing it', () => {
    const longText = 'x'.repeat(21);
    const check = checkAnswer(item(), LIMITS, entry({ texts: [longText] }));

    expect(!check.ok && check.violations.join(' ')).toContain('longer than 20 characters');
    expect(!check.ok && check.violations.join(' ')).not.toContain(longText);
  });

  it('accepts a rejection with no option or text and marks it rejected', () => {
    const check = checkAnswer(item(), LIMITS, entry({ reject: true }));

    expect(check.ok).toBe(true);
    expect(check.ok && check.answer).toMatchObject({ question: item().question, rejected: true });
  });

  it('refuses a rejection that also carries an option or text', () => {
    const check = checkAnswer(item(), LIMITS, entry({ reject: true, options: ['staging'] }));

    expect(!check.ok && check.violations).toContain('a rejected question takes no option or text');
  });
});

describe('checkPromptAnswers', () => {
  it('builds one answer per question, in question order', () => {
    const two = [item(), item({ question: 'Which checks?', multiSelect: true, options: [{ label: 'unit', description: '' }, { label: 'e2e', description: '' }] })];
    const request = { entries: [
      { question: 2, options: ['e2e', 'unit'], texts: [], reject: false },
      { question: 'Which environment should the migration run in?', options: ['production'], texts: [], reject: false },
    ] };

    const check = checkPromptAnswers(pending(two), request);

    expect(check).toEqual({
      ok: true,
      prompt: {
        messageId: 'm-2',
        questionId: 'q-1',
        answers: [
          { question: 'Which environment should the migration run in?', values: ['production'] },
          { question: 'Which checks?', values: ['e2e', 'unit'] },
        ],
      },
    });
  });

  it('reports a question without an answer', () => {
    const two = [item(), item({ question: 'Which checks?' })];
    const check = checkPromptAnswers(pending(two), { entries: [entry({ options: ['staging'] })] });

    expect(!check.ok && check.violations).toEqual(['question 2 has no answer']);
  });

  it('reports a question addressed twice and a position that does not exist', () => {
    const check = checkPromptAnswers(pending(), { entries: [entry({ options: ['staging'] }), entry({ question: 4, options: ['staging'] })] });

    expect(!check.ok && check.violations).toEqual([
      'the prompt has 1 question; 4 is not one of them',
    ]);
  });

  it('keeps the question position in the violation when one question is wrong', () => {
    const check = checkPromptAnswers(pending(), { entries: [entry({ options: ['nope'] })] });

    expect(!check.ok && check.violations).toEqual(['question 1: option "nope" is not one of the question\'s options']);
  });
});

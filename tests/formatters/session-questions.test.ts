import { describe, expect, it } from 'vitest';
import type { PCode_Models_MessageUserQuestionDto } from '../../src/generated/api/models/PCode_Models_MessageUserQuestionDto';
import {
  formatPendingQuestionHuman,
  formatQuestionLines,
  formatSessionMessagesHuman,
  formatWaitNoQuestionLine,
  formatWaitQuestionPointer,
} from '../../src/formatters/session';
import { CliNotFoundError, CliQuestionAnswerError, EXIT_CODES, normalizeCliError } from '../../src/runtime/errors';

const SECRET_VALUE = 'correct-horse-battery-staple';

function secretAnswered(): PCode_Models_MessageUserQuestionDto {
  return {
    questionId: 'q-7',
    state: 'answered',
    questions: [{
      question: 'Which API key should the deploy use?',
      header: 'Credential',
      multiSelect: false,
      options: [{ label: 'ci-bot', description: 'the CI key' }],
      allowCustomAnswer: true,
      isSecret: true,
    }],
    // The backend stores a placeholder for a secret answer; the value itself reaches only the executor.
    answers: [{ question: 'Which API key should the deploy use?', values: ['[redacted]'] }],
    answeredAt: '2026-11-02T10:05:00Z',
    limits: { maxAnswerLength: 200, maxValuesPerQuestion: 20 },
  };
}

function pendingMultiSelect(): PCode_Models_MessageUserQuestionDto {
  return {
    questionId: 'q-1',
    state: 'pending',
    questions: [
      {
        question: 'Which environment should the migration run in?',
        header: 'Deployment target',
        multiSelect: false,
        options: [
          { label: 'staging', description: 'safe to repeat' },
          { label: 'production', description: 'needs a maintenance window' },
        ],
        allowCustomAnswer: true,
        isSecret: false,
      },
      {
        question: 'Which checks should run before the merge?',
        header: '',
        multiSelect: true,
        options: [
          { label: 'unit tests', description: 'fast, runs locally' },
          { label: 'e2e suite', description: 'slow, needs a browser' },
        ],
        allowCustomAnswer: false,
        isSecret: false,
      },
    ],
    limits: { maxAnswerLength: 200, maxValuesPerQuestion: 20 },
  };
}

describe('formatQuestionLines', () => {
  it('prints each question with its header, numbered options, selection mode and custom-answer allowance', () => {
    const text = formatQuestionLines(pendingMultiSelect()).join('\n');

    expect(text).toContain('Prompt q-1 · state: pending');
    expect(text).toContain('Question 1 of 2 · Deployment target');
    expect(text).toContain('1. staging   safe to repeat');
    expect(text).toContain('2. production   needs a maintenance window');
    expect(text).toContain('Single choice · custom answer allowed (max 200 characters)');
    expect(text).toContain('Question 2 of 2');
    expect(text).toContain('Multi-select · custom answer not allowed');
    expect(text).not.toContain('Answer:');
  });

  it('shows "answer hidden" for an answered secret question and never the stored or submitted value', () => {
    const text = formatQuestionLines(secretAnswered()).join('\n');

    expect(text).toContain('Answer: answer hidden');
    expect(text).not.toContain('[redacted]');
    expect(text).not.toContain(SECRET_VALUE);
  });

  it('shows the answer of an answered question that is not secret', () => {
    const question = secretAnswered();
    question.questions[0].isSecret = false;
    question.answers = [{ question: question.questions[0].question, values: ['ci-bot'] }];

    expect(formatQuestionLines(question).join('\n')).toContain('Answer: ci-bot');
  });

  it('lists the state of a question that was never answered without an answer line', () => {
    const question = pendingMultiSelect();
    question.state = 'expired';

    expect(formatQuestionLines(question).join('\n')).toContain('state: expired');
  });
});

describe('messages human view with questions', () => {
  it('prints the question of a message and keeps a secret answer out of the output', () => {
    const text = formatSessionMessagesHuman({
      sessionId: 's-1',
      page: 1,
      pageSize: 50,
      totalCount: 1,
      totalPages: 1,
      messages: [{
        id: 'm-7',
        sessionId: 's-1',
        type: 'Assistant',
        mode: 'Plan',
        timestamp: '2026-11-02T10:00:00Z',
        creationTime: '2026-11-02T10:00:00Z',
        contentBlocks: [{ type: 'Text', text: 'Need the key.' }],
        model: null,
        provider: null,
        userQuestion: secretAnswered(),
      }],
    } as never);

    expect(text).toContain('Need the key.');
    expect(text).toContain('Which API key should the deploy use?');
    expect(text).toContain('answer hidden');
    expect(text).not.toContain(SECRET_VALUE);
  });

  it('prints a pending question on its own with the message id', () => {
    const text = formatPendingQuestionHuman({ messageId: 'm-2', userQuestion: pendingMultiSelect() });

    expect(text.startsWith('Pending question on message m-2\n')).toBe(true);
  });
});

describe('wait pointer', () => {
  it('names the pending question and both follow-up commands, and states the agent safety rule', () => {
    const text = formatWaitQuestionPointer({
      command: 'hagitask',
      sessionId: 's-9',
      summary: { messageId: 'm-2', questionId: 'q-1', state: 'pending', questionCount: 2 },
    });

    expect(text).toContain('Pending question: 2 questions, id q-1, on message m-2');
    expect(text).toContain('hagi hagitask messages --session-id s-9 --pending-question');
    expect(text).toContain('hagi hagitask answer --session-id s-9');
    expect(text).toContain('An agent answers only on an explicit user request or an explicit Saga instruction.');
  });

  it('says that no pending question was found', () => {
    expect(formatWaitNoQuestionLine('proposal', 's-3')).toContain('No pending question was found.');
  });
});

describe('answer exit codes', () => {
  it('defines 35 and 36 once each, next to the existing codes', () => {
    expect(EXIT_CODES.QUESTION_INVALID_ANSWER).toBe(35);
    expect(EXIT_CODES.QUESTION_ALREADY_ANSWERED).toBe(36);

    const values = Object.values(EXIT_CODES);
    expect(new Set(values).size).toBe(values.length);
  });

  it('maps the answer errors to their exit codes', () => {
    expect(normalizeCliError(new CliQuestionAnswerError('bad', EXIT_CODES.QUESTION_INVALID_ANSWER)).exitCode).toBe(35);
    expect(normalizeCliError(new CliQuestionAnswerError('done', EXIT_CODES.QUESTION_ALREADY_ANSWERED)).exitCode).toBe(36);
    expect(normalizeCliError(new CliNotFoundError('none')).exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });
});

import { create, fromJson, type Message } from '@bufbuild/protobuf';
import { Code, ConnectError, createRouterTransport, type Transport } from '@connectrpc/connect';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AnswerSessionQuestionResponseSchema,
  AnswerSessionQuestionsResponseSchema,
  GetSessionMessagesResponseSchema,
  SessionMessagingService,
} from '../../src/generated/grpc/hagicode/session/v1/session_messaging_pb';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';

// The facade reaches the backend through getGrpcTransport(). Replace only that function, with an in-process router, so the
// real Connect clients and the real proto mappers run.
const transportHolder = vi.hoisted(() => ({ current: undefined as Transport | undefined }));
vi.mock('../../src/runtime/grpc/transport', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/runtime/grpc/transport')>()),
  getGrpcTransport: () => transportHolder.current,
}));

const QUESTION = {
  question: 'Which environment should the migration run in?',
  header: 'Deployment target',
  multiSelect: false,
  options: [
    { label: 'staging', description: 'safe to repeat' },
    { label: 'production', description: 'needs a maintenance window' },
  ],
  allowCustomAnswer: true,
  isSecret: true,
};

const PENDING_MESSAGE = {
  id: 'm-2',
  sessionId: 's-1',
  type: 'Assistant',
  mode: 'Plan',
  timestamp: '2026-11-02T10:00:00Z',
  creationTime: '2026-11-02T10:00:00Z',
  contentBlocks: [],
  model: null,
  provider: null,
  userQuestion: {
    questionId: 'q-1',
    state: 'answered',
    questions: [QUESTION],
    answers: [{ question: QUESTION.question, values: ['[redacted]'] }],
    answeredAt: '2026-11-02T10:05:00Z',
    limits: { maxAnswerLength: 200, maxValuesPerQuestion: 20 },
  },
};

function withoutQuestion(message: typeof PENDING_MESSAGE) {
  const { userQuestion: _omitted, ...rest } = message;
  return rest;
}

const calls = {
  single: 0,
  batch: 0,
  lastSingle: undefined as Message | undefined,
  lastBatch: undefined as Message | undefined,
};

beforeEach(() => {
  calls.single = 0;
  calls.batch = 0;
  calls.lastSingle = undefined;
  calls.lastBatch = undefined;
  transportHolder.current = createRouterTransport(({ service }) => {
    service(SessionMessagingService, {
      answerSessionQuestion: request => {
        calls.single += 1;
        calls.lastSingle = request;
        if (request.questionId === 'unavailable') {
          throw new ConnectError('backend unavailable', Code.Unavailable);
        }

        return create(AnswerSessionQuestionResponseSchema, { result: { outcome: 'resumed', state: 'answered' } });
      },
      answerSessionQuestions: request => {
        calls.batch += 1;
        calls.lastBatch = request;
        return create(AnswerSessionQuestionsResponseSchema, {
          result: {
            status: 'completed',
            items: request.items.map(item => ({ messageId: item.messageId, questionId: item.questionId, outcome: 'delivered', state: 'answered' })),
          },
        });
      },
      getSessionMessages: () => fromJson(GetSessionMessagesResponseSchema, {
        result: {
          sessionId: 's-1',
          page: 1,
          pageSize: 50,
          totalCount: 1,
          totalPages: 1,
          messages: [PENDING_MESSAGE],
        },
      }),
    });
  });
});

describe('answer RPCs through the facade', () => {
  it('sends one AnswerSessionQuestion call with the item and returns the outcome', async () => {
    const api = createGrpcHagiApi();

    const result = await api.answerSessionQuestion('s-1', {
      messageId: 'm-2',
      questionId: 'q-1',
      answers: [{ question: QUESTION.question, values: ['staging'] }],
    });

    expect(result).toEqual({ outcome: 'resumed', state: 'answered' });
    expect(calls.single).toBe(1);
    expect(calls.batch).toBe(0);
    expect(calls.lastSingle).toMatchObject({
      sessionId: 's-1',
      messageId: 'm-2',
      questionId: 'q-1',
      answers: [{ question: QUESTION.question, values: ['staging'], rejected: false }],
    });
  });

  it('does not retry an answer that failed in transport', async () => {
    const api = createGrpcHagiApi();

    await expect(api.answerSessionQuestion('s-1', {
      messageId: 'm-2',
      questionId: 'unavailable',
      answers: [{ question: QUESTION.question, values: ['staging'] }],
    })).rejects.toBeInstanceOf(ConnectError);
    expect(calls.single).toBe(1);
  });

  it('sends one AnswerSessionQuestions call for a batch and returns the items in request order', async () => {
    const api = createGrpcHagiApi();

    const result = await api.answerSessionQuestions('s-1', [{
      messageId: 'm-2',
      questionId: 'q-1',
      answers: [{ question: QUESTION.question, values: ['staging'] }],
    }]);

    expect(calls.batch).toBe(1);
    expect(calls.single).toBe(0);
    expect(result.items).toEqual([{ messageId: 'm-2', questionId: 'q-1', outcome: 'delivered', state: 'answered' }]);
  });
});

describe('the question of a message list', () => {
  it('reaches the CLI DTO field by field, with nothing dropped', async () => {
    const api = createGrpcHagiApi();

    const list = await api.getSessionMessages('s-1', { page: 1, order: 'desc' });

    expect(list.messages[0].userQuestion).toMatchObject({
      questionId: 'q-1',
      state: 'answered',
      questions: [{
        question: QUESTION.question,
        header: QUESTION.header,
        multiSelect: false,
        options: QUESTION.options,
        allowCustomAnswer: true,
        isSecret: true,
      }],
      answers: [{ question: QUESTION.question, values: ['[redacted]'] }],
      answeredAt: '2026-11-02T10:05:00Z',
      limits: { maxAnswerLength: 200, maxValuesPerQuestion: 20 },
    });
  });

  it('leaves userQuestion absent on a message that asked none', async () => {
    transportHolder.current = createRouterTransport(({ service }) => {
      service(SessionMessagingService, {
        getSessionMessages: () => fromJson(GetSessionMessagesResponseSchema, {
          result: {
            sessionId: 's-1',
            page: 1,
            pageSize: 50,
            totalCount: 1,
            totalPages: 1,
            messages: [withoutQuestion(PENDING_MESSAGE)],
          },
        }),
      });
    });

    const list = await createGrpcHagiApi().getSessionMessages('s-1', { page: 1, order: 'desc' });

    expect(list.messages[0]).not.toHaveProperty('userQuestion');
  });
});

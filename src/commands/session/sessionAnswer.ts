import { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import {
  CliNotFoundError,
  CliQuestionAnswerError,
  EXIT_CODES,
} from '../../runtime/errors';
import type { AnswerSessionQuestionItemInput, HagiApi } from '../../runtime/hagiApi';
import {
  checkPromptAnswers,
  exitCodeForResults,
  findPendingQuestion,
  readAnswerRequest,
  type AnswerFlags,
} from '../../runtime/questionAnswers';

/** Raw options of `proposal answer` and `hagitask answer`, as commander hands them over. */
export type SessionAnswerOptions = AnswerFlags & {
  sessionId: string;
  json?: boolean;
};

/** One result line of the `answer` output. It carries no answer value, so a secret answer cannot leak through it. */
export type AnswerResultView = {
  questionId: string;
  outcome: string;
  state?: string;
  reason?: string;
};

function collect(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

/**
 * Registers `answer`: it answers the newest pending question of a session. It reads the messages once, picks the pending
 * question, checks the answer against it before sending, and makes one RPC: `AnswerSessionQuestion` when the prompt has one
 * question, `AnswerSessionQuestions` (one batch item carrying every answer) when it has several. It never retries.
 */
export function registerSessionAnswerCommand(
  parent: Command,
  dependencies: AppDependencies,
  options: { description: string; command: 'proposal' | 'hagitask' },
): void {
  addJsonOption(
    parent
      .command('answer')
      .description(options.description),
  )
    .requiredOption('--session-id <id>', 'Session id whose pending question to answer.')
    .option('--option <label|index>', 'Choose an option by its label, or by its 1-based number as `messages --pending-question` prints it. Repeat for a multi-select question.', collect)
    .option('--text <text>', 'Free-text answer, when the question allows one. Repeat for a multi-select question.', collect)
    .option('--question <n>', 'Position of the question in the prompt, 1-based (default 1).')
    .option('--input <file|->', 'JSON document with the answers to every question of the prompt. "-" reads standard input.')
    .option('--reject', 'Decline the question instead of answering it.')
    .action(async function sessionAnswerAction(this: Command, rawOptions: SessionAnswerOptions) {
      // Every usage error comes before the first network call: the flags, the document and the session id.
      const request = await readAnswerRequest({
        option: rawOptions.option,
        text: rawOptions.text,
        question: rawOptions.question,
        input: rawOptions.input,
        reject: rawOptions.reject,
      });
      const sessionId = requireOptionValue(rawOptions.sessionId, '--session-id');
      const context = createCommandContext(this, dependencies);

      // One read of the newest page; the pending question is picked from it.
      const list = await context.api.getSessionMessages(sessionId, { page: 1, order: 'desc' });
      const pending = findPendingQuestion(list.messages);
      if (!pending) {
        throw new CliNotFoundError(`No pending question in session ${sessionId}. Read the messages with: hagi ${options.command} messages --session-id ${sessionId}`);
      }

      const check = checkPromptAnswers(pending, request);
      if (!check.ok) {
        throw new CliQuestionAnswerError(
          `Answer not sent: ${check.violations.join('; ')}.`,
          EXIT_CODES.QUESTION_INVALID_ANSWER,
        );
      }

      const item: AnswerSessionQuestionItemInput = {
        messageId: check.prompt.messageId,
        questionId: check.prompt.questionId,
        answers: check.prompt.answers,
      };

      const results = await sendAnswer(context.api, sessionId, item, check.prompt.answers.length);
      const exitCode = exitCodeForResults(results);
      const output = {
        sessionId,
        messageId: item.messageId,
        results: results.map(toResultView),
      };

      if (context.outputJson) {
        context.io.stdout(formatJson(output));
      } else {
        context.io.stdout(formatAnswerHuman(output.results, pending.userQuestion.questions.length));
      }

      if (exitCode !== 0) {
        const failed = results.find(result => exitCodeForResults([result]) !== 0);
        throw new CliQuestionAnswerError(
          `Answer not accepted for question ${failed?.questionId ?? item.questionId}: ${failed?.outcome ?? 'unknown'}${failed?.reason ? ` (${failed.reason})` : ''}.`,
          exitCode,
        );
      }
    });
}

/**
 * Sends the answer with the RPC that matches the prompt: one question, `AnswerSessionQuestion`; several, one
 * `AnswerSessionQuestions` call. Results are returned in question order.
 */
async function sendAnswer(
  api: Pick<HagiApi, 'answerSessionQuestion' | 'answerSessionQuestions'>,
  sessionId: string,
  item: AnswerSessionQuestionItemInput,
  questionCount: number,
): Promise<AnswerResultView[]> {
  if (questionCount <= 1) {
    const single = await api.answerSessionQuestion(sessionId, item);
    return [{ questionId: item.questionId, ...single }];
  }

  const batch = await api.answerSessionQuestions(sessionId, [item]);
  if (batch.items.length === 0) {
    return [{ questionId: item.questionId, outcome: 'invalid', reason: batch.reason }];
  }

  return batch.items.map(result => ({
    questionId: result.questionId,
    outcome: result.outcome,
    state: result.state,
    reason: result.reason,
  }));
}

function toResultView(result: AnswerResultView): AnswerResultView {
  return {
    questionId: result.questionId,
    outcome: result.outcome,
    ...(result.state !== undefined ? { state: result.state } : {}),
    ...(result.reason !== undefined ? { reason: result.reason } : {}),
  };
}

/** One line per result. A secret answer is never printed; the result holds only the outcome, state and reason. */
export function formatAnswerHuman(results: AnswerResultView[], questionCount: number): string {
  const lines = results.map(result => {
    const reason = result.reason ? ` (${result.reason})` : '';
    const state = result.state ? `; the question is now ${result.state}` : '';
    return `Question ${result.questionId}: ${result.outcome}${reason}${state}`;
  });

  if (questionCount > 1 && results.length > 0) {
    lines.push(`Answered ${questionCount} questions of the prompt in one call.`);
  }

  return lines.join('\n') + '\n';
}

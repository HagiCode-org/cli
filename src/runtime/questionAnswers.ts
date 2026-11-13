/**
 * Pure rules for the interactive questions of a session: picking the pending question, reading the answer flags and
 * document, checking the answers against the question before anything is sent, and mapping the backend's outcomes to
 * exit codes. Nothing here calls the network; the commands do.
 *
 * Secret questions: a violation names the rule only. The submitted value is never part of an error message, so a secret
 * answer cannot reach the output, a log or a thrown message.
 */
import type {
  PCode_Models_MessageUserQuestionDto,
  PCode_Models_MessageUserQuestionItemDto,
  PCode_Models_MessageUserQuestionLimitsDto,
} from '../generated/api/models/PCode_Models_MessageUserQuestionDto';
import { CliUsageError, EXIT_CODES } from './errors';
import { loadStructuredJson } from './inputLoader';
import type { AnswerValueInput } from './hagiApi';

/** The state of a question nobody has answered yet. */
export const QUESTION_STATE_PENDING = 'pending';

/** A message that carries an interactive question, as the message list returns it. */
export type MessageWithQuestion = {
  id: string;
  userQuestion?: PCode_Models_MessageUserQuestionDto;
};

export type PendingQuestion = {
  messageId: string;
  userQuestion: PCode_Models_MessageUserQuestionDto;
};

/** The pointer `--wait` prints at WaitingForReply. It names the question and holds no answer value. */
export type PendingQuestionSummary = {
  messageId: string;
  questionId: string;
  state: string;
  questionCount: number;
};

/**
 * The newest message whose question is still pending. The list is read with `order=desc`, so the first match is the newest.
 * Returns undefined when no question is pending, which callers map to the not-found exit code.
 */
export function findPendingQuestion(messages: readonly MessageWithQuestion[]): PendingQuestion | undefined {
  for (const message of messages) {
    const question = message.userQuestion;
    if (question && question.state === QUESTION_STATE_PENDING) {
      return { messageId: message.id, userQuestion: question };
    }
  }

  return undefined;
}

export function summarizePendingQuestion(pending: PendingQuestion): PendingQuestionSummary {
  return {
    messageId: pending.messageId,
    questionId: pending.userQuestion.questionId,
    state: pending.userQuestion.state,
    questionCount: pending.userQuestion.questions.length,
  };
}

/**
 * The exit code of one backend outcome. `delivered` and `resumed` are accepted (0). `already-answered` and `cancelled` mean
 * the question is no longer open (36). `not-found` reuses the existing not-found code (24). `invalid`, `failed` and any
 * value this CLI does not know map to 35 with the backend reason, never to success.
 */
export function exitCodeForOutcome(outcome: string): number {
  switch (outcome) {
    case 'delivered':
    case 'resumed':
      return 0;
    case 'already-answered':
    case 'cancelled':
      return EXIT_CODES.QUESTION_ALREADY_ANSWERED;
    case 'not-found':
      return EXIT_CODES.HTTP_NOT_FOUND;
    default:
      return EXIT_CODES.QUESTION_INVALID_ANSWER;
  }
}

/**
 * The exit code of a batch: the code of the first item, in question order, that was not accepted; 0 when every item was.
 * Every item's outcome is still printed by the caller.
 */
export function exitCodeForResults(results: readonly { outcome: string }[]): number {
  for (const result of results) {
    const code = exitCodeForOutcome(result.outcome);
    if (code !== 0) {
      return code;
    }
  }

  return 0;
}

/** The answer as the user wrote it. An option is a label, or a 1-based index when it is a number (flags) or a JSON number. */
export type AnswerEntry = {
  /** 1-based position of the question in the prompt, or the question text. */
  question: number | string;
  options: Array<string | number>;
  texts: string[];
  reject: boolean;
};

export type AnswerRequest = {
  entries: AnswerEntry[];
};

export type AnswerFlags = {
  option?: string[];
  text?: string[];
  question?: string;
  input?: string;
  reject?: boolean;
};

/**
 * Reads the answer the user gave, before any network call. Flags address one question; `--input` carries one or more.
 * Conflicting flags and malformed documents are usage errors.
 */
export async function readAnswerRequest(flags: AnswerFlags): Promise<AnswerRequest> {
  const options = flags.option ?? [];
  const texts = flags.text ?? [];
  const reject = flags.reject === true;
  const hasInput = flags.input !== undefined;

  if (hasInput) {
    const conflicts = [
      options.length > 0 ? '--option' : undefined,
      texts.length > 0 ? '--text' : undefined,
      flags.question !== undefined ? '--question' : undefined,
      reject ? '--reject' : undefined,
    ].filter((flag): flag is string => flag !== undefined);
    if (conflicts.length > 0) {
      throw new CliUsageError(`--input cannot be combined with ${conflicts.join(', ')}. Put every answer in the --input document.`);
    }

    return readAnswerDocument(flags.input as string);
  }

  if (reject && (options.length > 0 || texts.length > 0)) {
    throw new CliUsageError('--reject cannot be combined with --option or --text.');
  }

  if (!reject && options.length === 0 && texts.length === 0) {
    throw new CliUsageError('Give an answer with --option, --text, --input or --reject.');
  }

  return {
    entries: [{
      question: parsePositiveWhole(flags.question ?? '1', '--question'),
      options: options.map(option => (/^\d+$/.test(option.trim()) ? Number(option.trim()) : option.trim())),
      texts: texts.map(text => text.trim()),
      reject,
    }],
  };
}

const DOCUMENT_KEYS = new Set(['question', 'options', 'text', 'reject']);

async function readAnswerDocument(source: string): Promise<AnswerRequest> {
  const document = await loadStructuredJson<unknown>(source);
  if (!isRecord(document) || !Array.isArray(document.answers) || document.answers.length === 0) {
    throw new CliUsageError('The --input document must be an object with a non-empty "answers" array.');
  }

  const entries = document.answers.map((raw, index): AnswerEntry => {
    const at = `answers[${index}]`;
    if (!isRecord(raw)) {
      throw new CliUsageError(`${at} must be an object.`);
    }

    for (const key of Object.keys(raw)) {
      if (!DOCUMENT_KEYS.has(key)) {
        throw new CliUsageError(`${at} has an unknown key "${key}". Allowed keys: question, options, text, reject.`);
      }
    }

    const question = raw.question;
    if (typeof question === 'number' && Number.isInteger(question) && question >= 1) {
      // A 1-based position.
    } else if (typeof question === 'string' && question.trim().length > 0) {
      // The question text, which is also the key of the answer.
    } else {
      throw new CliUsageError(`${at}.question must be a 1-based position or the question text.`);
    }

    const options = raw.options ?? [];
    if (!Array.isArray(options) || !options.every(option => typeof option === 'string' || (typeof option === 'number' && Number.isInteger(option)))) {
      throw new CliUsageError(`${at}.options must be a list of option labels (strings) or 1-based indexes (numbers).`);
    }

    const texts = raw.text ?? [];
    if (!Array.isArray(texts) || !texts.every(text => typeof text === 'string')) {
      throw new CliUsageError(`${at}.text must be a list of strings.`);
    }

    if (raw.reject !== undefined && typeof raw.reject !== 'boolean') {
      throw new CliUsageError(`${at}.reject must be true or false.`);
    }

    return {
      question: question as number | string,
      options: options as Array<string | number>,
      texts: (texts as string[]).map(text => text.trim()),
      reject: raw.reject === true,
    };
  });

  return { entries };
}

function parsePositiveWhole(raw: string, flag: string): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 1) {
    throw new CliUsageError(`${flag} must be a positive whole number.`);
  }

  return Number(trimmed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The result of checking one question's answer: the values to send, or every rule it broke. */
export type AnswerCheck =
  | { ok: true; answer: AnswerValueInput }
  | { ok: false; violations: string[] };

/**
 * Checks one answer against its question and the limits the backend sent with it. Every rule that fails is listed. A
 * violation names the rule; for a non-secret question it may also name the offending option or position, never a secret value.
 */
export function checkAnswer(
  question: PCode_Models_MessageUserQuestionItemDto,
  limits: PCode_Models_MessageUserQuestionLimitsDto,
  entry: AnswerEntry,
): AnswerCheck {
  const violations: string[] = [];
  const secret = question.isSecret === true;
  const values: string[] = [];

  if (entry.reject && (entry.options.length > 0 || entry.texts.length > 0)) {
    violations.push('a rejected question takes no option or text');
  }

  for (const option of entry.options) {
    const label = resolveOption(question, option);
    if (label === undefined) {
      violations.push(secret
        ? 'an option is not one of the question\'s options'
        : `option "${String(option)}" is not one of the question's options`);
      continue;
    }

    values.push(label);
  }

  if (!entry.reject) {
    if (entry.texts.some(text => text.length === 0)) {
      violations.push('a free-text answer is empty');
    }

    const texts = entry.texts.filter(text => text.length > 0);
    if (texts.length > 0 && !question.allowCustomAnswer) {
      violations.push('a custom answer is not allowed for this question');
    }

    values.push(...texts);
  }

  if (!entry.reject && values.length === 0 && violations.length === 0) {
    violations.push('an answer is required');
  }

  if (!question.multiSelect && values.length > 1) {
    violations.push('a single-choice question takes exactly one answer');
  }

  if (values.length > limits.maxValuesPerQuestion) {
    violations.push(`at most ${limits.maxValuesPerQuestion} answers are allowed for this question`);
  }

  if (values.some(value => value.length > limits.maxAnswerLength)) {
    violations.push(`an answer is longer than ${limits.maxAnswerLength} characters`);
  }

  if (violations.length > 0) {
    return { ok: false, violations };
  }

  return {
    ok: true,
    answer: {
      question: question.question,
      values: entry.reject ? [] : values,
      ...(entry.reject ? { rejected: true } : {}),
    },
  };
}

/** The label of an option given as a label or a 1-based index, or undefined when it is not one of the question's options. */
function resolveOption(question: PCode_Models_MessageUserQuestionItemDto, option: string | number): string | undefined {
  if (typeof option === 'number') {
    return Number.isInteger(option) && option >= 1 && option <= question.options.length
      ? question.options[option - 1].label
      : undefined;
  }

  const match = question.options.find(candidate => candidate.label === option);
  return match?.label;
}

/** The answers of a whole prompt, one per question in question order, ready for one request. */
export type PromptAnswers = {
  messageId: string;
  questionId: string;
  answers: AnswerValueInput[];
};

export type PromptCheck =
  | { ok: true; prompt: PromptAnswers }
  | { ok: false; violations: string[] };

/**
 * Lines the entries up with the questions of the pending prompt and checks each one. The backend needs an answer for every
 * question of a prompt, so a missing answer is a violation, and a question addressed twice is too.
 */
export function checkPromptAnswers(pending: PendingQuestion, request: AnswerRequest): PromptCheck {
  const questions = pending.userQuestion.questions;
  const violations: string[] = [];
  const entryFor = new Map<number, AnswerEntry>();

  for (const entry of request.entries) {
    const position = resolvePosition(questions, entry.question);
    if (position === undefined) {
      violations.push(typeof entry.question === 'number'
        ? `the prompt has ${questions.length} question${questions.length === 1 ? '' : 's'}; ${entry.question} is not one of them`
        : 'a question named in the answer document is not part of the pending prompt');
      continue;
    }

    if (entryFor.has(position)) {
      violations.push(`question ${position + 1} is answered more than once`);
      continue;
    }

    entryFor.set(position, entry);
  }

  const answers: AnswerValueInput[] = [];
  questions.forEach((question, position) => {
    const entry = entryFor.get(position);
    if (!entry) {
      violations.push(`question ${position + 1} has no answer`);
      return;
    }

    const check = checkAnswer(question, pending.userQuestion.limits, entry);
    if (!check.ok) {
      violations.push(...check.violations.map(rule => `question ${position + 1}: ${rule}`));
      return;
    }

    answers.push(check.answer);
  });

  if (violations.length > 0) {
    return { ok: false, violations };
  }

  return {
    ok: true,
    prompt: {
      messageId: pending.messageId,
      questionId: pending.userQuestion.questionId,
      answers,
    },
  };
}

function resolvePosition(questions: readonly PCode_Models_MessageUserQuestionItemDto[], question: number | string): number | undefined {
  if (typeof question === 'number') {
    return question >= 1 && question <= questions.length ? question - 1 : undefined;
  }

  const position = questions.findIndex(candidate => candidate.question === question);
  return position === -1 ? undefined : position;
}

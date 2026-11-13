import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
import type { PCode_Application_Contracts_Dto_MessageListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MessageListResponseDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import { PCode_Models_SessionStatus } from '../generated/api/models/PCode_Models_SessionStatus';
import type {
  PCode_Models_MessageUserQuestionDto,
  PCode_Models_MessageUserQuestionItemDto,
} from '../generated/api/models/PCode_Models_MessageUserQuestionDto';
import type { PendingQuestionSummary } from '../runtime/questionAnswers';
import { renderKeyValueTable, renderTable } from './table';

type IdLike =
  | string
  | {
      value?: string | null;
    };

export type SessionView = {
  sessionId: string;
  title: string;
  type: string;
  status: string;
  projectId: string;
  proposalName?: string;
  archived: boolean;
  lastActiveAt?: string;
  enableIndependentWorkspace: boolean;
  baseBranch?: string;
  metadata?: string;
  /** The write-once user metadata entries. Set only when the session has some; the human view shows them sorted by key. */
  userMetadata?: Record<string, string>;
  chatExecutorType?: string;
  /** The Hero the session is bound to. Set only when the response carries one, so output without it is unchanged. */
  chatHero?: { heroId: string; name: string };
};

/** A session response, plus the `user_metadata` map the OpenAPI session model does not carry. */
export type SessionResponseWithUserMetadata = PCode_Models_SessionResponseDto & {
  userMetadata?: Record<string, string> | null;
};

export type SessionListPayload = {
  sessions: SessionView[];
};

function readIdValue(identifier?: IdLike | null): string {
  if (typeof identifier === 'string') {
    return identifier.trim();
  }

  return identifier?.value?.trim() ?? '';
}

/** The user metadata of a response, or undefined when it has no entries (the output then omits the field). */
function readUserMetadata(session: SessionResponseWithUserMetadata): Record<string, string> | undefined {
  const entries = session.userMetadata;
  return entries && Object.keys(entries).length > 0 ? { ...entries } : undefined;
}

/** The bound Hero of a response, or undefined when it has none (the output then omits the field). */
function readChatHero(session: SessionResponseWithUserMetadata): { heroId: string; name: string } | undefined {
  const hero = session.chatHero;
  return hero?.heroId ? { heroId: hero.heroId, name: hero.name } : undefined;
}

/** `key=value` pairs, sorted by key and joined with ", ". */
export function formatUserMetadata(entries: Record<string, string>): string {
  return Object.keys(entries)
    .sort()
    .map(key => `${key}=${entries[key]}`)
    .join(', ');
}

export function toSessionView(session: SessionResponseWithUserMetadata): SessionView {
  const userMetadata = readUserMetadata(session);
  const chatHero = readChatHero(session);
  return {
    sessionId: readIdValue(session.sessionId),
    title: session.title,
    type: session.type,
    status: session.status,
    projectId: readIdValue(session.projectId),
    proposalName: session.proposalName ?? undefined,
    archived: session.status === PCode_Models_SessionStatus.ARCHIVED,
    lastActiveAt: session.lastActiveAt ?? undefined,
    enableIndependentWorkspace: session.enableIndependentWorkspace,
    baseBranch: session.baseBranch ?? undefined,
    metadata: session.metadata ?? undefined,
    ...(userMetadata ? { userMetadata } : {}),
    chatExecutorType: session.chatExecutorType ?? undefined,
    ...(chatHero ? { chatHero } : {}),
  };
}

export function toSessionListPayload(
  response: PCode_Application_Contracts_Dto_SessionListResponseDto,
): SessionListPayload {
  return {
    sessions: response.sessions.map(toSessionView),
  };
}

export function formatSessionListHuman(label: string, sessions: SessionView[]): string {
  if (sessions.length === 0) {
    return `No ${label.toLowerCase()} found.\n`;
  }

  return `${label} (${sessions.length})\n${renderTable(
    [
      { header: 'Session ID', value: session => session.sessionId },
      { header: 'Title', value: session => session.title },
      { header: 'Status', value: session => session.status },
      { header: 'Project ID', value: session => session.projectId },
      { header: 'Archived', value: session => (session.archived ? 'yes' : 'no') },
    ],
    sessions,
  )}\n`;
}

export function formatSessionSummaryHuman(
  session: SessionView,
  extras: Array<[string, string | undefined]> = [],
): string {
  return renderKeyValueTable([
    ['sessionId', session.sessionId],
    ['type', session.type],
    ['title', session.title],
    ['status', session.status],
    ['projectId', session.projectId],
    ['proposalName', session.proposalName],
    ['independentWorkspace', String(session.enableIndependentWorkspace)],
    ['baseBranch', session.baseBranch],
    ['chatExecutorType', session.chatExecutorType],
    ['chatHero', session.chatHero ? `${session.chatHero.name} (${session.chatHero.heroId})` : undefined],
    ['metadata', session.metadata],
    ['userMetadata', session.userMetadata ? formatUserMetadata(session.userMetadata) : undefined],
    ...extras,
  ]);
}

/** How a send's Steer setting was resolved and what happened to it. `reason` is set only when Steer was requested but not used. */
export type SteerView = {
  requested: boolean;
  source: 'flag' | 'env' | 'config' | 'default';
  effective: boolean;
  outcome?: string;
  messageId?: string;
  reason?: string;
};

/** The `steer` object of the `--json` output. Optional fields are left out when they do not apply. */
export type SteerJson = {
  requested: boolean;
  source: SteerView['source'];
  effective: boolean;
  outcome?: string;
  messageId?: string;
  reason?: string;
};

/**
 * One line for a `queued` Steer. It does not say the message is waiting: the backend also answers `queued` for an idle
 * session, where the message starts a run at once.
 */
export const STEER_QUEUED_NOTE = 'No running task took the message, so it was sent as the next message.';

export function toSteerJson(steer: SteerView): SteerJson {
  return {
    requested: steer.requested,
    source: steer.source,
    effective: steer.effective,
    ...(steer.outcome !== undefined ? { outcome: steer.outcome } : {}),
    ...(steer.messageId !== undefined ? { messageId: steer.messageId } : {}),
    ...(steer.reason !== undefined ? { reason: steer.reason } : {}),
  };
}

export function formatSessionMessageHuman(
  label: string,
  sessionId: string,
  response: PCode_Application_Contracts_Dto_PostMessageResponseDto,
  extras: Array<[string, string | undefined]> = [],
  steer?: SteerView,
): string {
  // Steer rows appear only when a source set the setting, so a send with no Steer setting keeps its original output.
  const steerRows: Array<[string, string | undefined]> =
    steer && steer.source !== 'default'
      ? [
          ['steer', `${steer.requested ? 'on' : 'off'} (${steer.source})`],
          ['effective', steer.effective ? 'yes' : 'no'],
          ['outcome', steer.outcome],
          ['messageId', steer.messageId],
          ['reason', steer.reason],
        ]
      : [];
  const queuedNote = steer?.effective && steer.outcome === 'queued' ? `${STEER_QUEUED_NOTE}\n` : '';

  return `${label}\n${renderKeyValueTable([
    ['sessionId', sessionId],
    ['message', response.message],
    ...extras,
    ...steerRows,
  ])}${queuedNote}`;
}

/** The result of a `--wait`, as the `wait` object of the JSON output and as one human line. */
export type SessionWaitView = {
  settled: boolean;
  timedOut: boolean;
  transitionSeen: boolean;
  polls: number;
  elapsedSeconds: number;
};

export function formatSessionWaitLine(wait: SessionWaitView, status: string): string {
  if (wait.timedOut) {
    return `wait: timed out after ${wait.elapsedSeconds}s; status is still ${status}\n`;
  }

  // The backend's WaitingForReply is missing from the hand-maintained PCode_Models_SessionStatus enum; a literal keeps the
  // enum, and so the proposal status choices, unchanged.
  if (status === 'WaitingForReply') {
    return `wait: settled at ${status} after ${wait.elapsedSeconds}s; a person must answer\n`;
  }

  const transition = wait.transitionSeen ? 'a status change was seen' : 'no status change was seen';
  return `wait: settled at ${status} after ${wait.polls} poll(s) in ${wait.elapsedSeconds}s; ${transition}\n`;
}

/**
 * Human view of one page of messages: the text blocks of each message, and a count of the other blocks, which the
 * human view does not print. The `--json` view of the same page is the DTO itself, unchanged.
 */
export function formatSessionMessagesHuman(list: PCode_Application_Contracts_Dto_MessageListResponseDto): string {
  if (list.messages.length === 0) {
    return 'No messages found.\n';
  }

  const sections = list.messages.map(message => {
    const blocks = message.contentBlocks ?? [];
    const textBlocks = blocks.filter(block => block.type === 'Text' && typeof (block as { text?: unknown }).text === 'string');
    const skipped = blocks.length - textBlocks.length;
    const lines = [`[${message.timestamp}] ${message.type}`];

    for (const block of textBlocks) {
      for (const line of (block as { text: string }).text.split('\n')) {
        lines.push(`  ${line}`);
      }
    }

    if (skipped > 0) {
      lines.push(`  (${skipped} other block${skipped === 1 ? '' : 's'} not shown)`);
    }

    if (message.userQuestion) {
      lines.push(...formatQuestionLines(message.userQuestion).map(line => `  ${line}`));
    }

    return lines.join('\n');
  });

  return `Messages (${list.messages.length} of ${list.totalCount})\n${sections.join('\n\n')}\n`;
}

/**
 * Human lines of one interactive question: each question's position, header and text, its numbered options with their
 * descriptions, single or multi-select, whether a custom answer is allowed, and the prompt state. An answer is shown for an
 * answered question, except that a secret question shows "answer hidden" in place of its value.
 */
export function formatQuestionLines(question: PCode_Models_MessageUserQuestionDto): string[] {
  const lines = [`Prompt ${question.questionId} · state: ${question.state}`];
  const total = question.questions.length;

  question.questions.forEach((item, index) => {
    const header = item.header ? ` · ${item.header}` : '';
    lines.push(`  Question ${index + 1} of ${total}${header}`);
    lines.push(`    ${item.question}`);
    item.options.forEach((option, optionIndex) => {
      const description = option.description ? `   ${option.description}` : '';
      lines.push(`      ${optionIndex + 1}. ${option.label}${description}`);
    });

    const mode = item.multiSelect ? 'Multi-select' : 'Single choice';
    const custom = item.allowCustomAnswer
      ? `custom answer allowed (max ${question.limits.maxAnswerLength} characters)`
      : 'custom answer not allowed';
    lines.push(`    ${mode} · ${custom}`);

    if (question.state === 'answered') {
      lines.push(`    Answer: ${answerTextFor(question, item)}`);
    }
  });

  return lines;
}

function answerTextFor(question: PCode_Models_MessageUserQuestionDto, item: PCode_Models_MessageUserQuestionItemDto): string {
  if (item.isSecret === true) {
    return 'answer hidden';
  }

  const answer = question.answers?.find(candidate => candidate.question === item.question);
  if (!answer) {
    return '(no answer recorded)';
  }

  if (answer.rejected === true) {
    return 'rejected';
  }

  return answer.values.join(', ');
}

/** Human view of the pending question that `messages --pending-question` prints. */
export function formatPendingQuestionHuman(pending: { messageId: string; userQuestion: PCode_Models_MessageUserQuestionDto }): string {
  return [`Pending question on message ${pending.messageId}`, ...formatQuestionLines(pending.userQuestion)].join('\n') + '\n';
}

/**
 * The pointer `--wait` prints at WaitingForReply when a question is pending: the summary, the read command and the answer
 * command, and the rule that an agent answers only when asked to. The command prefix is `proposal` or `hagitask`.
 */
export function formatWaitQuestionPointer(options: {
  command: 'proposal' | 'hagitask';
  sessionId: string;
  summary: PendingQuestionSummary;
}): string {
  const { command, sessionId, summary } = options;
  const count = `${summary.questionCount} question${summary.questionCount === 1 ? '' : 's'}`;
  return [
    `Pending question: ${count}, id ${summary.questionId}, on message ${summary.messageId}`,
    `Read it:   hagi ${command} messages --session-id ${sessionId} --pending-question`,
    `Answer it: hagi ${command} answer --session-id ${sessionId} --option <label|index>   (or --text, --input <file|->, --reject)`,
    'An agent answers only on an explicit user request or an explicit Saga instruction.',
  ].join('\n') + '\n';
}

/** The line `--wait` prints at WaitingForReply when the pending question could not be read. */
export function formatWaitNoQuestionLine(command: 'proposal' | 'hagitask', sessionId: string): string {
  return `No pending question was found. Read the messages with: hagi ${command} messages --session-id ${sessionId}\n`;
}

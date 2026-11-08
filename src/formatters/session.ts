import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
import type { PCode_Application_Contracts_Dto_MessageListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MessageListResponseDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import { PCode_Models_SessionStatus } from '../generated/api/models/PCode_Models_SessionStatus';
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

/** `key=value` pairs, sorted by key and joined with ", ". */
export function formatUserMetadata(entries: Record<string, string>): string {
  return Object.keys(entries)
    .sort()
    .map(key => `${key}=${entries[key]}`)
    .join(', ');
}

export function toSessionView(session: SessionResponseWithUserMetadata): SessionView {
  const userMetadata = readUserMetadata(session);
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

    return lines.join('\n');
  });

  return `Messages (${list.messages.length} of ${list.totalCount})\n${sections.join('\n\n')}\n`;
}

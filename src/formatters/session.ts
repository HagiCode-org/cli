import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
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
  chatExecutorType?: string;
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

export function toSessionView(session: PCode_Models_SessionResponseDto): SessionView {
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
    ...extras,
  ]);
}

export function formatSessionMessageHuman(
  label: string,
  sessionId: string,
  response: PCode_Application_Contracts_Dto_PostMessageResponseDto,
  extras: Array<[string, string | undefined]> = [],
): string {
  return `${label}\n${renderKeyValueTable([
    ['sessionId', sessionId],
    ['message', response.message],
    ...extras,
  ])}`;
}

import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import { PCode_Models_SessionStatus } from '../generated/api/models/PCode_Models_SessionStatus';
import { renderKeyValueTable, renderTable } from './table';

type IdLike = {
  value?: string | null;
};

export type ProposalSessionView = {
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
};

function readIdValue(identifier?: IdLike | null): string {
  return identifier?.value?.trim() ?? '';
}

export function toProposalSessionView(session: PCode_Models_SessionResponseDto): ProposalSessionView {
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
  };
}

export function toProposalSessionListPayload(
  response: PCode_Application_Contracts_Dto_SessionListResponseDto,
): { sessions: ProposalSessionView[] } {
  return {
    sessions: response.sessions.map(toProposalSessionView),
  };
}

export function formatProposalSessionListHuman(sessions: ProposalSessionView[]): string {
  if (sessions.length === 0) {
    return 'No proposal sessions found.\n';
  }

  return `Proposal sessions (${sessions.length})\n${renderTable(
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

export function formatProposalSessionSummaryHuman(
  session: ProposalSessionView,
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
    ...extras,
  ]);
}

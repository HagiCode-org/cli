import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import {
  formatSessionListHuman,
  formatSessionSummaryHuman,
  toSessionListPayload,
  toSessionView,
  type SessionListPayload,
  type SessionView,
} from './session';

export type ProposalSessionView = SessionView;

export function toProposalSessionView(session: PCode_Models_SessionResponseDto): ProposalSessionView {
  return toSessionView(session);
}

export function toProposalSessionListPayload(
  response: PCode_Application_Contracts_Dto_SessionListResponseDto,
): SessionListPayload {
  return toSessionListPayload(response);
}

export function formatProposalSessionListHuman(sessions: ProposalSessionView[]): string {
  return formatSessionListHuman('Proposal sessions', sessions);
}

export function formatProposalSessionSummaryHuman(
  session: ProposalSessionView,
  extras: Array<[string, string | undefined]> = [],
): string {
  return formatSessionSummaryHuman(session, extras);
}

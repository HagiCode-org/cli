import type { PCode_Application_Contracts_Dto_ExecuteProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ExecuteProposalRequestDto';
import type { PCode_Application_Contracts_Dto_GenerateProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_GenerateProposalRequestDto';
import type { PCode_Application_Contracts_Dto_ProposalNameResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProposalNameResponseDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Application_Contracts_Dto_SimpleMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SimpleMessageResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import type { PCode_Models_SessionType } from '../generated/api/models/PCode_Models_SessionType';
import type { PCode_Web_Controllers_CreateSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateSessionRequest';
import { SessionsService } from '../generated/api/services/SessionsService';

export type ListSessionsInput = {
  type?: PCode_Models_SessionType;
  activeOnly?: boolean;
  includeArchived?: boolean;
  projectId?: string;
  projectIds?: string[];
};

export interface ProposalApi {
  listSessions(input: ListSessionsInput): Promise<PCode_Application_Contracts_Dto_SessionListResponseDto>;
  createSession(requestBody: PCode_Web_Controllers_CreateSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  generateProposalName(sessionId: string): Promise<PCode_Application_Contracts_Dto_ProposalNameResponseDto>;
  generateProposal(
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_GenerateProposalRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
  executeProposal(
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_ExecuteProposalRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
}

export function createGeneratedProposalApi(): ProposalApi {
  return {
    listSessions: input => SessionsService.getApiSessions(input),
    createSession: requestBody => SessionsService.postApiSessions({ requestBody }),
    generateProposalName: sessionId => SessionsService.postApiSessionsGenerateProposalName({ sessionId }),
    generateProposal: (sessionId, requestBody) =>
      SessionsService.postApiSessionsGenerateProposal({ sessionId, requestBody }),
    executeProposal: (sessionId, requestBody) =>
      SessionsService.postApiSessionsExecuteProposal({ sessionId, requestBody }),
  };
}

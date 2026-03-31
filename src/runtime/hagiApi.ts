import type { PCode_Application_Contracts_Dto_AnnotationSubmissionDto } from '../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionDto';
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto';
import type { PCode_Application_Contracts_Dto_ArchiveSessionRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ArchiveSessionRequestDto';
import type { PCode_Application_Contracts_Dto_CreateProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_CreateProjectDto';
import type { PCode_Application_Contracts_Dto_DataAggregationResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DataAggregationResponseDto';
import type { PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto';
import type { PCode_Application_Contracts_Dto_ExecuteProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ExecuteProposalRequestDto';
import type { PCode_Application_Contracts_Dto_GenerateProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_GenerateProposalRequestDto';
import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
import type { PCode_Application_Contracts_Dto_ProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProjectDto';
import type { PCode_Application_Contracts_Dto_ProposalNameResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProposalNameResponseDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Application_Contracts_Dto_SimpleMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SimpleMessageResponseDto';
import type { PCode_Application_Contracts_Dto_UpdateProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpdateProjectDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import type { PCode_Models_SessionType } from '../generated/api/models/PCode_Models_SessionType';
import type { PCode_Web_Controllers_CreateAutoTaskSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateAutoTaskSessionRequest';
import type { PCode_Web_Controllers_CreateChatSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateChatSessionRequest';
import type { PCode_Web_Controllers_CreateSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateSessionRequest';
import type { PCode_Web_Controllers_OptimizeDescriptionRequest } from '../generated/api/models/PCode_Web_Controllers_OptimizeDescriptionRequest';
import type { PCode_Web_Controllers_PostMessageRequest } from '../generated/api/models/PCode_Web_Controllers_PostMessageRequest';
import type { PCode_Web_Controllers_UpdateSessionRequest } from '../generated/api/models/PCode_Web_Controllers_UpdateSessionRequest';
import { DataAggregationService } from '../generated/api/services/DataAggregationService';
import { ProjectService } from '../generated/api/services/ProjectService';
import { SessionsService } from '../generated/api/services/SessionsService';

export type ListSessionsInput = {
  type?: PCode_Models_SessionType;
  activeOnly?: boolean;
  includeArchived?: boolean;
  projectId?: string;
  projectIds?: string[];
};

export interface HagiApi {
  listSessions(input: ListSessionsInput): Promise<PCode_Application_Contracts_Dto_SessionListResponseDto>;
  getSession(sessionId: string): Promise<PCode_Models_SessionResponseDto>;
  createProposalSession(requestBody: PCode_Web_Controllers_CreateSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  createChatSession(requestBody: PCode_Web_Controllers_CreateChatSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  createAutoTaskSession(requestBody: PCode_Web_Controllers_CreateAutoTaskSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  updateSession(sessionId: string, requestBody: PCode_Web_Controllers_UpdateSessionRequest): Promise<unknown>;
  deleteSession(sessionId: string, deleteFiles?: boolean): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
  sendMessage(sessionId: string, requestBody: PCode_Web_Controllers_PostMessageRequest): Promise<PCode_Application_Contracts_Dto_PostMessageResponseDto>;
  generateProposalName(sessionId: string): Promise<PCode_Application_Contracts_Dto_ProposalNameResponseDto>;
  optimizeDescription(
    sessionId: string,
    requestBody: PCode_Web_Controllers_OptimizeDescriptionRequest,
  ): Promise<PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto>;
  generateProposal(
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_GenerateProposalRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
  executeProposal(
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_ExecuteProposalRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
  archiveProposal(
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_ArchiveSessionRequestDto,
  ): Promise<PCode_Models_SessionResponseDto>;
  completeProposal(sessionId: string): Promise<PCode_Models_SessionResponseDto>;
  submitAnnotations(
    sessionId: string,
    requestBody: PCode_Application_Contracts_Dto_AnnotationSubmissionDto,
  ): Promise<PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto>;
  listProjects(): Promise<PCode_Application_Contracts_Dto_DataAggregationResponseDto>;
  createProject(requestBody: PCode_Application_Contracts_Dto_CreateProjectDto): Promise<PCode_Application_Contracts_Dto_ProjectDto>;
  updateProject(id: string, requestBody: PCode_Application_Contracts_Dto_UpdateProjectDto): Promise<PCode_Application_Contracts_Dto_ProjectDto>;
  deleteProject(id: string): Promise<unknown>;
  archiveChat(sessionId: string): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
}

export function createGeneratedHagiApi(): HagiApi {
  return {
    listSessions: input => SessionsService.getApiSessions(input),
    getSession: sessionId => SessionsService.getApiSessions1({ sessionId }),
    createProposalSession: requestBody => SessionsService.postApiSessions({ requestBody }),
    createChatSession: requestBody => SessionsService.postApiSessionsChat({ requestBody }),
    createAutoTaskSession: requestBody => SessionsService.postApiSessionsAutoTask({ requestBody }),
    updateSession: (sessionId, requestBody) => SessionsService.putApiSessions({ sessionId, requestBody }),
    deleteSession: (sessionId, deleteFiles) => SessionsService.deleteApiSessions({ sessionId, deleteFiles }),
    sendMessage: (sessionId, requestBody) => SessionsService.postApiSessionsMessages({ sessionId, requestBody }),
    generateProposalName: sessionId => SessionsService.postApiSessionsGenerateProposalName({ sessionId }),
    optimizeDescription: (sessionId, requestBody) =>
      SessionsService.postApiSessionsOptimizeDescription({ sessionId, requestBody }),
    generateProposal: (sessionId, requestBody) =>
      SessionsService.postApiSessionsGenerateProposal({ sessionId, requestBody }),
    executeProposal: (sessionId, requestBody) =>
      SessionsService.postApiSessionsExecuteProposal({ sessionId, requestBody }),
    archiveProposal: (sessionId, requestBody) => SessionsService.postApiSessionsArchive({ sessionId, requestBody }),
    completeProposal: sessionId => SessionsService.postApiSessionsComplete({ sessionId }),
    submitAnnotations: (sessionId, requestBody) =>
      SessionsService.postApiSessionsAnnotations({ sessionId, requestBody }),
    listProjects: () => DataAggregationService.getApiDataAggregation(),
    createProject: requestBody => ProjectService.postApiProject({ requestBody }),
    updateProject: (id, requestBody) => ProjectService.putApiProject({ id, requestBody }),
    deleteProject: id => ProjectService.deleteApiProject({ id }),
    archiveChat: sessionId => SessionsService.postApiSessionsArchiveChat({ sessionId }),
  };
}

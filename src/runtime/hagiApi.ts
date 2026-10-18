import type { PCode_Application_Contracts_Dto_AnnotationSubmissionDto } from '../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionDto';
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto';
import type { PCode_Application_Contracts_Dto_ArchiveSessionRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ArchiveSessionRequestDto';
import type { PCode_Application_Contracts_Dto_CreateProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_CreateProjectDto';
import type { PCode_Application_Contracts_Dto_CreateVaultRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_CreateVaultRequestDto';
import type { PCode_Application_Contracts_Dto_DataAggregationResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DataAggregationResponseDto';
import type { PCode_Application_Contracts_Dto_DeleteVaultResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DeleteVaultResponseDto';
import type { PCode_Application_Contracts_Dto_ExecuteProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ExecuteProposalRequestDto';
import type { PCode_Application_Contracts_Dto_GenerateProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_GenerateProposalRequestDto';
import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
import type { PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto';
import type { PCode_Application_Contracts_Dto_ProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProjectDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Application_Contracts_Dto_SimpleMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SimpleMessageResponseDto';
import type { PCode_Application_Contracts_Dto_UpdateProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpdateProjectDto';
import type { PCode_Application_Contracts_Dto_UpdateVaultRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpdateVaultRequestDto';
import type { PCode_Application_Contracts_Dto_VaultFileListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFileListResponseDto';
import type { PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto';
import type { PCode_Application_Contracts_Dto_VaultItemDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultItemDto';
import type { PCode_Application_Contracts_Dto_VaultListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultListResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import type { PCode_Models_SessionType } from '../generated/api/models/PCode_Models_SessionType';
import type { PCode_Web_Controllers_CreateAutoTaskSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateAutoTaskSessionRequest';
import type { PCode_Web_Controllers_CreateChatSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateChatSessionRequest';
import type { PCode_Web_Controllers_CreateSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateSessionRequest';
import type { PCode_Web_Controllers_OptimizeProposalRequest } from '../generated/api/models/PCode_Web_Controllers_OptimizeProposalRequest';
import type { PCode_Web_Controllers_PostMessageRequest } from '../generated/api/models/PCode_Web_Controllers_PostMessageRequest';
import type { PCode_Web_Controllers_ScheduledPlanResponse } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanResponse';
import type { PCode_Web_Controllers_ScheduledPlanRunAcceptedDto } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanRunAcceptedDto';
import type { PCode_Web_Controllers_ScheduledPlanSaveRequest } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanSaveRequest';
import type { PCode_Web_Controllers_UpdateSessionRequest } from '../generated/api/models/PCode_Web_Controllers_UpdateSessionRequest';
import type { PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto';
import type { PCode_Application_Contracts_Dto_InstallSkillRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_InstallSkillRequestDto';
import type { PCode_Application_Contracts_Dto_InstallSkillResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_InstallSkillResultDto';
import type { PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto';
import type { PCode_Application_Contracts_Dto_SkillGalleryDetailDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SkillGalleryDetailDto';
import type { PCode_Application_Contracts_Dto_SkillGalleryResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SkillGalleryResponseDto';
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto';
import type { PCode_Application_Contracts_Dto_UninstallLocalSkillRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UninstallLocalSkillRequestDto';
import type { PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto';
import type { PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto';
import { DataAggregationService } from '../generated/api/services/DataAggregationService';
import { ProjectService } from '../generated/api/services/ProjectService';
import { ScheduledPlansService } from '../generated/api/services/ScheduledPlansService';
import { SessionsService } from '../generated/api/services/SessionsService';
import { SkillGalleryService } from '../generated/api/services/SkillGalleryService';
import { VaultService } from '../generated/api/services/VaultService';

export type ListSessionsInput = {
  type?: PCode_Models_SessionType;
  activeOnly?: boolean;
  includeArchived?: boolean;
  projectId?: string;
  projectIds?: string[];
};

/**
 * Generate request. `proposalContentLanguage` is required by the backend but missing from the generated
 * model, so it is declared here until the client is regenerated.
 */
export type GenerateProposalInput = PCode_Application_Contracts_Dto_GenerateProposalRequestDto & {
  proposalContentLanguage: string;
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
  /** Optimizes the proposal description and, in the same backend step, the proposal title and name. */
  optimizeProposal(
    sessionId: string,
    requestBody: PCode_Web_Controllers_OptimizeProposalRequest,
  ): Promise<PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto>;
  generateProposal(
    sessionId: string,
    requestBody: GenerateProposalInput,
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
  listPlans(): Promise<PCode_Web_Controllers_ScheduledPlanResponse[]>;
  getPlan(id: string): Promise<PCode_Web_Controllers_ScheduledPlanResponse>;
  createPlan(requestBody: PCode_Web_Controllers_ScheduledPlanSaveRequest): Promise<PCode_Web_Controllers_ScheduledPlanResponse>;
  updatePlan(id: string, requestBody: PCode_Web_Controllers_ScheduledPlanSaveRequest): Promise<PCode_Web_Controllers_ScheduledPlanResponse>;
  deletePlan(id: string): Promise<void>;
  /** Creates a session from the plan's stored inputs now and waits for it. */
  runPlan(id: string): Promise<PCode_Models_SessionResponseDto>;
  /** Starts the same run in the background; resolves once the backend accepts it, before the session exists. */
  startPlan(id: string): Promise<PCode_Web_Controllers_ScheduledPlanRunAcceptedDto>;
  listVaults(): Promise<PCode_Application_Contracts_Dto_VaultListResponseDto>;
  createVault(requestBody: PCode_Application_Contracts_Dto_CreateVaultRequestDto): Promise<PCode_Application_Contracts_Dto_VaultItemDto>;
  updateVault(id: string, requestBody: PCode_Application_Contracts_Dto_UpdateVaultRequestDto): Promise<PCode_Application_Contracts_Dto_VaultItemDto>;
  deleteVault(id: string, deleteLocalFiles?: boolean): Promise<PCode_Application_Contracts_Dto_DeleteVaultResponseDto>;
  listVaultFiles(id: string, path?: string): Promise<PCode_Application_Contracts_Dto_VaultFileListResponseDto>;
  previewVaultFile(id: string, path: string): Promise<PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto>;
  archiveChat(sessionId: string): Promise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto>;
  listLocalSkills(): Promise<PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto>;
  uninstallLocalSkill(requestBody: PCode_Application_Contracts_Dto_UninstallLocalSkillRequestDto): Promise<PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto>;
  searchSkillGallery(query?: string): Promise<PCode_Application_Contracts_Dto_SkillGalleryResponseDto>;
  getSkillGalleryDetail(id: string, source: string): Promise<PCode_Application_Contracts_Dto_SkillGalleryDetailDto>;
  installGallerySkill(requestBody: PCode_Application_Contracts_Dto_InstallSkillRequestDto): Promise<PCode_Application_Contracts_Dto_InstallSkillResultDto>;
  listTrustedSkillProviders(): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
  upsertTrustedSkillProvider(requestBody: PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
  deleteTrustedSkillProvider(requestBody: PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
  resetTrustedSkillProviders(): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
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
    optimizeProposal: (sessionId, requestBody) =>
      SessionsService.postApiSessionsOptimizeProposal({ sessionId, requestBody }),
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
    listPlans: () => ScheduledPlansService.getApiScheduledPlans(),
    getPlan: id => ScheduledPlansService.getApiScheduledPlans1({ id }),
    createPlan: requestBody => ScheduledPlansService.postApiScheduledPlans({ requestBody }),
    updatePlan: (id, requestBody) => ScheduledPlansService.putApiScheduledPlans({ id, requestBody }),
    deletePlan: id => ScheduledPlansService.deleteApiScheduledPlans({ id }),
    runPlan: id => ScheduledPlansService.postApiScheduledPlansRun({ id }),
    startPlan: id => ScheduledPlansService.postApiScheduledPlansStart({ id }),
    listVaults: () => VaultService.getApiVaults(),
    createVault: requestBody => VaultService.postApiVaults({ requestBody }),
    updateVault: (id, requestBody) => VaultService.putApiVaults({ id, requestBody }),
    deleteVault: (id, deleteLocalFiles) => VaultService.deleteApiVaults({ id, deleteLocalFiles }),
    listVaultFiles: (id, path) => VaultService.getApiVaultsFiles({ id, path }),
    previewVaultFile: (id, path) => VaultService.getApiVaultsFilesContent({ id, path }),
    archiveChat: sessionId => SessionsService.postApiSessionsArchiveChat({ sessionId }),
    listLocalSkills: () => SkillGalleryService.getApiSkillsLocal(),
    uninstallLocalSkill: requestBody => SkillGalleryService.postApiSkillsLocalUninstall({ requestBody }),
    searchSkillGallery: query => SkillGalleryService.getApiSkillsGallery({ query }),
    getSkillGalleryDetail: (id, source) => SkillGalleryService.getApiSkillsGalleryDetail({ id, source }),
    installGallerySkill: requestBody => SkillGalleryService.postApiSkillsGalleryInstall({ requestBody }),
    listTrustedSkillProviders: () => SkillGalleryService.getApiSkillsProvidersTrusted(),
    upsertTrustedSkillProvider: requestBody => SkillGalleryService.postApiSkillsProvidersTrusted({ requestBody }),
    deleteTrustedSkillProvider: requestBody => SkillGalleryService.deleteApiSkillsProvidersTrusted({ requestBody }),
    resetTrustedSkillProviders: () => SkillGalleryService.postApiSkillsProvidersTrustedReset(),
  };
}

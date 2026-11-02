import { createClient } from '@connectrpc/connect';
import type { Message } from '@bufbuild/protobuf';
import type { GenMessage } from '@bufbuild/protobuf/codegenv2';
import {
  CreateProjectDtoSchema,
  CreateProjectResponseSchema,
  CloneMonoSpecsRepositoriesResponseSchema,
  GetMonoSpecsManagementResponseSchema,
  InitializeMonoSpecsResponseSchema,
  MonoSpecsCloneRepositoriesRequestDtoSchema,
  ProjectService,
  ReloadMonoSpecsResponseSchema,
  RemoveMonoSpecsRepositoryCheckoutResponseSchema,
  UpdateMonoSpecsManagementRequestDtoSchema,
  UpdateMonoSpecsManagementResponseSchema,
  UpdateProjectDtoSchema,
  UpdateProjectResponseSchema,
  ValidateMonoSpecsConfigResponseSchema,
  ValidateMonoSpecsRequestDtoSchema,
} from '../generated/grpc/hagicode/project/v1/project_pb';
import {
  CreateVaultRequestDtoSchema,
  CreateVaultResponseSchema,
  DeleteVaultResponseSchema,
  GetVaultFilePreviewResponseSchema,
  GetVaultFilesResponseSchema,
  ListVaultsResponseSchema,
  UpdateVaultRequestDtoSchema,
  UpdateVaultResponseSchema,
  VaultService,
} from '../generated/grpc/hagicode/project/v1/vault_pb';
import {
  CreateScheduledPlanResponseSchema,
  DeleteScheduledPlanResponseSchema,
  GetScheduledPlanResponseSchema,
  ListScheduledPlansResponseSchema,
  RunScheduledPlanResponseSchema,
  ScheduledPlanSaveRequestSchema,
  ScheduledPlansService,
  StartScheduledPlanResponseSchema,
  UpdateScheduledPlanResponseSchema,
} from '../generated/grpc/hagicode/community/v1/scheduled_plans_pb';
import {
  GetPresetTaskSchemaResponseSchema,
  ListPresetTaskSchemasResponseSchema,
  PresetTasksService,
} from '../generated/grpc/hagicode/community/v1/preset_tasks_pb';
import {
  DeleteTrustedSkillProviderRequestDtoSchema,
  DeleteTrustedSkillProviderResponseSchema,
  GetLocalSkillsResponseSchema,
  GetSkillGalleryAuditResponseSchema,
  GetSkillGalleryDetailResponseSchema,
  GetSkillGalleryResponseSchema,
  GetTrustedSkillProvidersResponseSchema,
  InstallSkillRequestDtoSchema,
  InstallSkillResponseSchema,
  ResetTrustedSkillProvidersResponseSchema,
  SetBuiltInSkillAvailabilityRequestDtoSchema,
  SetBuiltInSkillAvailabilityResponseSchema,
  SkillGalleryService,
  UninstallLocalSkillRequestDtoSchema,
  UninstallLocalSkillResponseSchema,
  UpsertTrustedSkillProviderRequestDtoSchema,
  UpsertTrustedSkillProviderResponseSchema,
} from '../generated/grpc/hagicode/community/v1/skill_gallery_pb';
import { GetAggregatedDataResponseSchema, StatisticsService } from '../generated/grpc/hagicode/platform/v1/statistics_pb';
import {
  AnnotationSubmissionDtoSchema,
  GetSessionMessagesResponseSchema,
  PostMessageRequestSchema,
  PostSessionMessageResponseSchema,
  SessionMessagingService,
  SubmitSessionAnnotationsResponseSchema,
} from '../generated/grpc/hagicode/session/v1/session_messaging_pb';
import {
  ArchiveSessionRequestDtoSchema,
  ArchiveSessionResponseSchema,
  CompleteSessionResponseSchema,
  ExecuteProposalRequestDtoSchema,
  ExecuteProposalResponseSchema,
  GenerateProposalRequestDtoSchema,
  GenerateProposalResponseSchema,
  OptimizeProposalRequestSchema,
  OptimizeSessionProposalResponseSchema,
  SessionProposalService,
} from '../generated/grpc/hagicode/session/v1/session_proposal_pb';
import {
  ArchiveChatSessionResponseSchema,
  CreateChatSessionRequestSchema,
  CreateHagiTaskSessionRequestSchema,
  CreateSessionRequestSchema,
  DeleteSessionResponseSchema,
  GetSessionResponseSchema,
  ListSessionsResponseSchema,
  OpenChatSessionResponseSchema,
  OpenSessionResponseSchema,
  SaveSessionResponseSchema,
  SessionsService,
  StartHagiTaskSessionResponseSchema,
  UpdateSessionRequestSchema,
} from '../generated/grpc/hagicode/session/v1/sessions_pb';
import { dtoToProto, resultOf } from './grpc/mappers';
import { getGrpcTransport } from './grpc/transport';
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionDto } from '../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionDto';
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto';
import type { PCode_Application_Contracts_Dto_ArchiveSessionRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ArchiveSessionRequestDto';
import type { PCode_Application_Contracts_Dto_CreateProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_CreateProjectDto';
import type { PCode_Application_Contracts_Dto_CreateVaultRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_CreateVaultRequestDto';
import type { PCode_Application_Contracts_Dto_DataAggregationResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DataAggregationResponseDto';
import type { PCode_Application_Contracts_Dto_DeleteVaultResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DeleteVaultResponseDto';
import type { PCode_Application_Contracts_Dto_ExecuteProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ExecuteProposalRequestDto';
import type { PCode_Application_Contracts_Dto_GenerateProposalRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_GenerateProposalRequestDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesRequestDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesResponseDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsRemoveCheckoutResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsRemoveCheckoutResponseDto';
import type { PCode_Application_Contracts_Dto_UpdateMonoSpecsManagementRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpdateMonoSpecsManagementRequestDto';
import type { PCode_Application_Contracts_Dto_ValidateMonoSpecsRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ValidateMonoSpecsRequestDto';
import type { PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto';
import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
import type { PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto';
import type { PCode_Application_Contracts_Dto_ProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProjectDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityRequestDto';
import type { PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto';
import type { PCode_Application_Contracts_Dto_SimpleMessageResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SimpleMessageResponseDto';
import type { PCode_Application_Contracts_Dto_UpdateProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpdateProjectDto';
import type { PCode_Application_Contracts_Dto_UpdateVaultRequestDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UpdateVaultRequestDto';
import type { PCode_Application_Contracts_Dto_VaultFileListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFileListResponseDto';
import type { PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto';
import type { PCode_Application_Contracts_Dto_VaultItemDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultItemDto';
import type { PCode_Application_Contracts_Dto_VaultListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultListResponseDto';
import type { PCode_Models_SessionResponseDto } from '../generated/api/models/PCode_Models_SessionResponseDto';
import type { PCode_Application_Contracts_Dto_MessageListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MessageListResponseDto';
import type { PCode_Models_SessionType } from '../generated/api/models/PCode_Models_SessionType';
import type { PCode_Web_Controllers_CreateChatSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateChatSessionRequest';
import type { PCode_Web_Controllers_CreateHagiTaskSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateHagiTaskSessionRequest';
import type { PCode_Web_Controllers_CreateSessionRequest } from '../generated/api/models/PCode_Web_Controllers_CreateSessionRequest';
import type { PCode_Web_Controllers_OptimizeProposalRequest } from '../generated/api/models/PCode_Web_Controllers_OptimizeProposalRequest';
import type { PCode_Web_Controllers_PostMessageRequest } from '../generated/api/models/PCode_Web_Controllers_PostMessageRequest';
import type { PCode_Web_Controllers_PresetTaskCreationSchemaDto } from '../generated/api/models/PCode_Web_Controllers_PresetTaskCreationSchemaDto';
import type { PCode_Web_Controllers_PresetTaskSchemaSummaryDto } from '../generated/api/models/PCode_Web_Controllers_PresetTaskSchemaSummaryDto';
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

export type ListSessionsInput = {
  type?: PCode_Models_SessionType;
  activeOnly?: boolean;
  includeArchived?: boolean;
  projectId?: string;
  projectIds?: string[];
};

/**
 * One provider's audit rating for a gallery skill. There is no generated REST model for it, so it is written by hand from
 * `SkillGalleryAuditProviderDto`. A value the backend did not supply is absent (not null).
 */
export type SkillGalleryAuditProviderDto = {
  provider: string;
  risk?: string;
  alerts?: number;
  score?: number;
  analyzedAt?: string;
};

/** The audit of one gallery skill. `providers` is empty when no provider supplied data. */
export type SkillGalleryAuditDto = {
  id: string;
  source: string;
  skillSlug: string;
  providers: SkillGalleryAuditProviderDto[];
};

/** One page of a session's messages. `order` `desc` (the backend default) returns the newest messages first. */
export type SessionMessagesInput = {
  page?: number;
  pageSize?: number;
  historyScope?: string;
  order?: 'asc' | 'desc';
};

export interface HagiApi {
  listSessions(input: ListSessionsInput): Promise<PCode_Application_Contracts_Dto_SessionListResponseDto>;
  getSession(sessionId: string): Promise<PCode_Models_SessionResponseDto>;
  /** Reads one page of a session's messages through the `GetSessionMessages` RPC. */
  getSessionMessages(sessionId: string, options?: SessionMessagesInput): Promise<PCode_Application_Contracts_Dto_MessageListResponseDto>;
  createProposalSession(requestBody: PCode_Web_Controllers_CreateSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  createChatSession(requestBody: PCode_Web_Controllers_CreateChatSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  /** Creates a session from a HagiTask preset task id or prompt id. The backend validates the structured input. */
  createHagiTaskSession(requestBody: PCode_Web_Controllers_CreateHagiTaskSessionRequest): Promise<PCode_Models_SessionResponseDto>;
  /** Lists the creation schema summary of every active HagiTask. */
  listHagiTaskSchemas(): Promise<PCode_Web_Controllers_PresetTaskSchemaSummaryDto[]>;
  /** Reads the creation schema of one active HagiTask. Unknown and disabled ids reject with 404. */
  getHagiTaskSchema(presetTaskId: string): Promise<PCode_Web_Controllers_PresetTaskCreationSchemaDto>;
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
    requestBody: PCode_Application_Contracts_Dto_GenerateProposalRequestDto,
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
  /** Reads the MonoSpecs management document of a project, including local Git state per repository. */
  getMonoSpecsManagement(id: string): Promise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto>;
  /** Saves the complete MonoSpecs management document. The backend validates it and returns the normalized document. */
  saveMonoSpecsManagement(
    id: string,
    requestBody: PCode_Application_Contracts_Dto_UpdateMonoSpecsManagementRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto>;
  initializeMonoSpecsManagement(id: string): Promise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto>;
  /** Rereads monospecs.yaml on the backend host and refreshes Git state. */
  reloadMonoSpecsManagement(id: string): Promise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto>;
  /** Validates the MonoSpecs configuration at a project path. The path is resolved by the caller. */
  validateMonoSpecs(
    requestBody: PCode_Application_Contracts_Dto_ValidateMonoSpecsRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto>;
  /** Clones configured repositories on the backend host. An empty request clones every missing repository. */
  cloneMonoSpecsRepositories(
    id: string,
    requestBody: PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesResponseDto>;
  /** Deletes the local checkout of one configured repository on the backend host. Dirty checkouts are refused unless forced. */
  removeMonoSpecsRepositoryCheckout(
    id: string,
    path: string,
    force: boolean,
  ): Promise<PCode_Application_Contracts_Dto_MonoSpecsRemoveCheckoutResponseDto>;
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
  /** Turns one built-in skill on or off. A failed result (for example an unknown slug) is returned with `succeeded` false. */
  setBuiltInSkillAvailability(
    requestBody: PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityRequestDto,
  ): Promise<PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto>;
  searchSkillGallery(query?: string): Promise<PCode_Application_Contracts_Dto_SkillGalleryResponseDto>;
  getSkillGalleryDetail(id: string, source: string): Promise<PCode_Application_Contracts_Dto_SkillGalleryDetailDto>;
  /** Third-party audit ratings for a gallery skill. Empty `providers` means no data; the backend never answers with an error for that. */
  getSkillGalleryAudit(id: string, source: string): Promise<SkillGalleryAuditDto>;
  installGallerySkill(requestBody: PCode_Application_Contracts_Dto_InstallSkillRequestDto): Promise<PCode_Application_Contracts_Dto_InstallSkillResultDto>;
  listTrustedSkillProviders(): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
  upsertTrustedSkillProvider(requestBody: PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
  deleteTrustedSkillProvider(requestBody: PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
  resetTrustedSkillProviders(): Promise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto>;
}


// One Connect client per call: the transport is cached per base URL, so the active runtime settings always apply.
const projects = () => createClient(ProjectService, getGrpcTransport());
const vaults = () => createClient(VaultService, getGrpcTransport());
const scheduledPlans = () => createClient(ScheduledPlansService, getGrpcTransport());
const presetTasks = () => createClient(PresetTasksService, getGrpcTransport());
const skills = () => createClient(SkillGalleryService, getGrpcTransport());
const statistics = () => createClient(StatisticsService, getGrpcTransport());
const sessions = () => createClient(SessionsService, getGrpcTransport());
const sessionMessaging = () => createClient(SessionMessagingService, getGrpcTransport());
const sessionProposal = () => createClient(SessionProposalService, getGrpcTransport());

/** Every RPC answers `{ result }`; this returns that result as the DTO the facade promises. */
async function result<T>(schema: GenMessage<Message>, response: Promise<Message>): Promise<T> {
  return resultOf<T>(schema, await response);
}

/**
 * The facade over the backend's gRPC services (`hagicode.*.v1`, gRPC-Web under `/grpc`). Every method keeps the signature and
 * the DTO type the REST client had, so commands and formatters are unchanged. A failure is a `ConnectError`;
 * `normalizeCliError` maps it to the same exit codes the REST statuses had.
 */
export function createGrpcHagiApi(): HagiApi {
  return {
    listSessions: async input =>
      result(
        ListSessionsResponseSchema,
        sessions().listSessions({
          type: input.type,
          activeOnly: input.activeOnly,
          includeArchived: input.includeArchived,
          projectId: input.projectId,
          projectIds: input.projectIds ?? [],
        }),
      ),
    getSession: async sessionId => result(GetSessionResponseSchema, sessions().getSession({ sessionId })),
    getSessionMessages: async (sessionId, options = {}) =>
      result(
        GetSessionMessagesResponseSchema,
        sessionMessaging().getSessionMessages({
          sessionId,
          page: options.page,
          pageSize: options.pageSize,
          historyScope: options.historyScope,
          order: options.order,
        }),
      ),
    createProposalSession: async requestBody =>
      result(OpenSessionResponseSchema, sessions().openSession({ body: dtoToProto(CreateSessionRequestSchema, requestBody) })),
    createChatSession: async requestBody =>
      result(
        OpenChatSessionResponseSchema,
        sessions().openChatSession({ body: dtoToProto(CreateChatSessionRequestSchema, requestBody) }),
      ),
    createHagiTaskSession: async requestBody =>
      result(
        StartHagiTaskSessionResponseSchema,
        sessions().startHagiTaskSession({ body: dtoToProto(CreateHagiTaskSessionRequestSchema, requestBody) }),
      ),
    listHagiTaskSchemas: async () => result(ListPresetTaskSchemasResponseSchema, presetTasks().listPresetTaskSchemas({})),
    getHagiTaskSchema: async presetTaskId =>
      result(GetPresetTaskSchemaResponseSchema, presetTasks().getPresetTaskSchema({ presetTaskId })),
    updateSession: async (sessionId, requestBody) =>
      result(
        SaveSessionResponseSchema,
        sessions().saveSession({ sessionId, body: dtoToProto(UpdateSessionRequestSchema, requestBody) }),
      ),
    deleteSession: async (sessionId, deleteFiles) =>
      result(DeleteSessionResponseSchema, sessions().deleteSession({ sessionId, deleteFiles: deleteFiles ?? false })),
    sendMessage: async (sessionId, requestBody) =>
      result(
        PostSessionMessageResponseSchema,
        sessionMessaging().postSessionMessage({ sessionId, body: dtoToProto(PostMessageRequestSchema, requestBody) }),
      ),
    optimizeProposal: async (sessionId, requestBody) =>
      result(
        OptimizeSessionProposalResponseSchema,
        sessionProposal().optimizeSessionProposal({ sessionId, body: dtoToProto(OptimizeProposalRequestSchema, requestBody) }),
      ),
    generateProposal: async (sessionId, requestBody) =>
      result(
        GenerateProposalResponseSchema,
        sessionProposal().generateProposal({ sessionId, body: dtoToProto(GenerateProposalRequestDtoSchema, requestBody) }),
      ),
    executeProposal: async (sessionId, requestBody) =>
      result(
        ExecuteProposalResponseSchema,
        sessionProposal().executeProposal({ sessionId, body: dtoToProto(ExecuteProposalRequestDtoSchema, requestBody ?? {}) }),
      ),
    archiveProposal: async (sessionId, requestBody) =>
      result(
        ArchiveSessionResponseSchema,
        sessionProposal().archiveSession({ sessionId, body: dtoToProto(ArchiveSessionRequestDtoSchema, requestBody ?? {}) }),
      ),
    completeProposal: async sessionId => result(CompleteSessionResponseSchema, sessionProposal().completeSession({ sessionId })),
    submitAnnotations: async (sessionId, requestBody) =>
      result(
        SubmitSessionAnnotationsResponseSchema,
        sessionMessaging().submitSessionAnnotations({ sessionId, body: dtoToProto(AnnotationSubmissionDtoSchema, requestBody) }),
      ),
    listProjects: async () =>
      result(GetAggregatedDataResponseSchema, statistics().getAggregatedData({ forceRefresh: false })),
    createProject: async requestBody =>
      result(CreateProjectResponseSchema, projects().createProject({ body: dtoToProto(CreateProjectDtoSchema, requestBody) })),
    updateProject: async (id, requestBody) =>
      result(UpdateProjectResponseSchema, projects().updateProject({ id, body: dtoToProto(UpdateProjectDtoSchema, requestBody) })),
    deleteProject: async id => {
      await projects().deleteProject({ id });
    },
    getMonoSpecsManagement: async id =>
      result(GetMonoSpecsManagementResponseSchema, projects().getMonoSpecsManagement({ projectId: id })),
    saveMonoSpecsManagement: async (id, requestBody) =>
      result(
        UpdateMonoSpecsManagementResponseSchema,
        projects().updateMonoSpecsManagement({
          projectId: id,
          body: dtoToProto(UpdateMonoSpecsManagementRequestDtoSchema, requestBody),
        }),
      ),
    initializeMonoSpecsManagement: async id =>
      result(InitializeMonoSpecsResponseSchema, projects().initializeMonoSpecs({ projectId: id })),
    reloadMonoSpecsManagement: async id => result(ReloadMonoSpecsResponseSchema, projects().reloadMonoSpecs({ projectId: id })),
    validateMonoSpecs: async requestBody =>
      result(
        ValidateMonoSpecsConfigResponseSchema,
        projects().validateMonoSpecsConfig({ body: dtoToProto(ValidateMonoSpecsRequestDtoSchema, requestBody) }),
      ),
    cloneMonoSpecsRepositories: async (id, requestBody) =>
      result(
        CloneMonoSpecsRepositoriesResponseSchema,
        projects().cloneMonoSpecsRepositories({
          projectId: id,
          body: dtoToProto(MonoSpecsCloneRepositoriesRequestDtoSchema, requestBody),
        }),
      ),
    removeMonoSpecsRepositoryCheckout: async (id, path, force) =>
      result(
        RemoveMonoSpecsRepositoryCheckoutResponseSchema,
        projects().removeMonoSpecsRepositoryCheckout({ projectId: id, path, force }),
      ),
    listPlans: async () => result(ListScheduledPlansResponseSchema, scheduledPlans().listScheduledPlans({})),
    getPlan: async id => result(GetScheduledPlanResponseSchema, scheduledPlans().getScheduledPlan({ id })),
    createPlan: async requestBody =>
      result(
        CreateScheduledPlanResponseSchema,
        scheduledPlans().createScheduledPlan({ body: dtoToProto(ScheduledPlanSaveRequestSchema, requestBody) }),
      ),
    updatePlan: async (id, requestBody) =>
      result(
        UpdateScheduledPlanResponseSchema,
        scheduledPlans().updateScheduledPlan({ id, body: dtoToProto(ScheduledPlanSaveRequestSchema, requestBody) }),
      ),
    deletePlan: async id => {
      await scheduledPlans().deleteScheduledPlan({ id });
    },
    runPlan: async id => result(RunScheduledPlanResponseSchema, scheduledPlans().runScheduledPlan({ id })),
    startPlan: async id => result(StartScheduledPlanResponseSchema, scheduledPlans().startScheduledPlan({ id })),
    listVaults: async () => result(ListVaultsResponseSchema, vaults().listVaults({})),
    createVault: async requestBody =>
      result(CreateVaultResponseSchema, vaults().createVault({ body: dtoToProto(CreateVaultRequestDtoSchema, requestBody) })),
    updateVault: async (id, requestBody) =>
      result(UpdateVaultResponseSchema, vaults().updateVault({ id, body: dtoToProto(UpdateVaultRequestDtoSchema, requestBody) })),
    deleteVault: async (id, deleteLocalFiles) =>
      result(DeleteVaultResponseSchema, vaults().deleteVault({ id, deleteLocalFiles: deleteLocalFiles ?? false })),
    listVaultFiles: async (id, path) => result(GetVaultFilesResponseSchema, vaults().getVaultFiles({ id, path })),
    previewVaultFile: async (id, path) => result(GetVaultFilePreviewResponseSchema, vaults().getVaultFilePreview({ id, path })),
    archiveChat: async sessionId => result(ArchiveChatSessionResponseSchema, sessions().archiveChatSession({ sessionId })),
    listLocalSkills: async () => result(GetLocalSkillsResponseSchema, skills().getLocalSkills({})),
    uninstallLocalSkill: async requestBody =>
      result(
        UninstallLocalSkillResponseSchema,
        skills().uninstallLocalSkill({ body: dtoToProto(UninstallLocalSkillRequestDtoSchema, requestBody) }),
      ),
    setBuiltInSkillAvailability: async requestBody =>
      result(
        SetBuiltInSkillAvailabilityResponseSchema,
        skills().setBuiltInSkillAvailability({ body: dtoToProto(SetBuiltInSkillAvailabilityRequestDtoSchema, requestBody) }),
      ),
    searchSkillGallery: async query => result(GetSkillGalleryResponseSchema, skills().getSkillGallery({ query })),
    getSkillGalleryDetail: async (id, source) =>
      result(GetSkillGalleryDetailResponseSchema, skills().getSkillGalleryDetail({ id, source })),
    getSkillGalleryAudit: async (id, source) =>
      result(GetSkillGalleryAuditResponseSchema, skills().getSkillGalleryAudit({ id, source })),
    installGallerySkill: async requestBody =>
      result(InstallSkillResponseSchema, skills().installSkill({ body: dtoToProto(InstallSkillRequestDtoSchema, requestBody) })),
    listTrustedSkillProviders: async () =>
      result(GetTrustedSkillProvidersResponseSchema, skills().getTrustedSkillProviders({})),
    upsertTrustedSkillProvider: async requestBody =>
      result(
        UpsertTrustedSkillProviderResponseSchema,
        skills().upsertTrustedSkillProvider({ body: dtoToProto(UpsertTrustedSkillProviderRequestDtoSchema, requestBody) }),
      ),
    deleteTrustedSkillProvider: async requestBody =>
      result(
        DeleteTrustedSkillProviderResponseSchema,
        skills().deleteTrustedSkillProvider({ body: dtoToProto(DeleteTrustedSkillProviderRequestDtoSchema, requestBody) }),
      ),
    resetTrustedSkillProviders: async () =>
      result(ResetTrustedSkillProvidersResponseSchema, skills().resetTrustedSkillProviders({})),
  };
}

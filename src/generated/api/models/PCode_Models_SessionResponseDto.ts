/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
import type { PCode_Models_ChatHeroSummaryDto } from './PCode_Models_ChatHeroSummaryDto';
import type { PCode_Models_OpenSpecFilesInfo } from './PCode_Models_OpenSpecFilesInfo';
import type { PCode_Models_ProjectId } from './PCode_Models_ProjectId';
import type { PCode_Models_QueueMessageSummaryDto } from './PCode_Models_QueueMessageSummaryDto';
import type { PCode_Models_RepositoryInfoDto } from './PCode_Models_RepositoryInfoDto';
import type { PCode_Models_SessionId } from './PCode_Models_SessionId';
import type { PCode_Models_SessionStatus } from './PCode_Models_SessionStatus';
import type { PCode_Models_SessionType } from './PCode_Models_SessionType';
import type { PCode_Models_StageExecutorInfoDto } from './PCode_Models_StageExecutorInfoDto';
import type { PCode_Models_StageHeroSelectionDto } from './PCode_Models_StageHeroSelectionDto';
export type PCode_Models_SessionResponseDto = {
  sessionId: PCode_Models_SessionId;
  title: string;
  description: string | null;
  chiefComplaint: string | null;
  code: number;
  type: PCode_Models_SessionType;
  status: PCode_Models_SessionStatus;
  isActive: boolean;
  lastActiveAt?: string | null;
  projectId: PCode_Models_ProjectId;
  projectName: string;
  projectPath: string;
  isMonoSpecs: boolean;
  subRepositories?: Array<PCode_Models_RepositoryInfoDto> | null;
  proposalName?: string | null;
  openSpecFiles?: PCode_Models_OpenSpecFilesInfo;
  pendingMessageCount?: number;
  queueMessages?: Array<PCode_Models_QueueMessageSummaryDto> | null;
  enableIndependentWorkspace: boolean;
  workingDirectory: string | null;
  baseBranch?: string | null;
  readonly workspaceBranchName?: string | null;
  metadata: string | null;
  chatExecutorType?: PCode_Models_AIProviderType;
  chatHero?: PCode_Models_ChatHeroSummaryDto;
  stageExecutorMap?: Record<string, PCode_Models_StageExecutorInfoDto> | null;
  stageHeroSelectionMap?: Record<string, PCode_Models_StageHeroSelectionDto> | null;
};


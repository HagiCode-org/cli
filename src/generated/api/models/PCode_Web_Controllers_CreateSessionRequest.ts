/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_SessionMessageImageRefDto } from './PCode_Application_DTOs_SessionMessageImageRefDto';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
import type { PCode_Models_TargetRepositoryDto } from './PCode_Models_TargetRepositoryDto';
import type { PCode_Web_Controllers_GitHubIssueMetadata } from './PCode_Web_Controllers_GitHubIssueMetadata';
export type PCode_Web_Controllers_CreateSessionRequest = {
  title: string;
  chiefComplaint?: string | null;
  originalChiefComplaint?: string | null;
  draftImageRefs?: Array<PCode_Application_DTOs_SessionMessageImageRefDto> | null;
  type?: string | null;
  projectId: string;
  /**
   * Whether to enable an independent Git worktree workspace for this session
   */
  enableIndependentWorkspace?: boolean;
  /**
   * The base branch for workspace
   */
  baseBranch?: string | null;
  /**
   * Target repositories for MonoSpecs proposal modification constraints.
   * When specified, AI should limit modifications to only these repositories.
   */
  targetRepositories?: Array<PCode_Models_TargetRepositoryDto> | null;
  /**
   * Whether title is default placeholder "新建主意" (New Proposal)
   * When true, system will automatically generate a meaningful title after description optimization
   */
  isDefaultTitle?: boolean;
  executorType?: PCode_Models_AIProviderType;
  gitHubIssue?: PCode_Web_Controllers_GitHubIssueMetadata;
};


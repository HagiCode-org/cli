/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
import type { PCode_Models_ChatHeroSummaryDto } from './PCode_Models_ChatHeroSummaryDto';
import type { PCode_Models_StageExecutorInfoDto } from './PCode_Models_StageExecutorInfoDto';
import type { PCode_Models_StageHeroSelectionDto } from './PCode_Models_StageHeroSelectionDto';
/**
 * Summary DTO for a session in the concurrency limit response
 */
export type PCode_Application_Contracts_Dto_SessionSummaryDto = {
  /**
   * Session ID
   */
  sessionId?: string | null;
  /**
   * Session title
   */
  title?: string | null;
  /**
   * Session status
   */
  status?: string | null;
  /**
   * Whether the session is active
   */
  isActive?: boolean;
  chatExecutorType?: PCode_Models_AIProviderType;
  chatHero?: PCode_Models_ChatHeroSummaryDto;
  /**
   * Canonical stage executor snapshot for proposal sessions
   */
  stageExecutorMap?: Record<string, PCode_Models_StageExecutorInfoDto> | null;
  /**
   * Canonical stage hero selection snapshot for proposal sessions
   */
  stageHeroSelectionMap?: Record<string, PCode_Models_StageHeroSelectionDto> | null;
};


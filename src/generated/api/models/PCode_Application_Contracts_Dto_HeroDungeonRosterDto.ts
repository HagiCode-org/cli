/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroDungeonMemberDto } from './PCode_Application_Contracts_Dto_HeroDungeonMemberDto';
import type { PCode_Application_Contracts_Dto_PromptImageSummaryDto } from './PCode_Application_Contracts_Dto_PromptImageSummaryDto';
export type PCode_Application_Contracts_Dto_HeroDungeonRosterDto = {
  scriptKey: string;
  displayName: string;
  description?: string | null;
  groupKey: string;
  sortOrder?: number;
  displayNameKey?: string | null;
  icon?: string | null;
  promptStageStyleKey?: string | null;
  promptStageStyleLabel?: string | null;
  promptArtStyle?: string | null;
  promptDisplayMode?: string | null;
  promptImageSummary?: PCode_Application_Contracts_Dto_PromptImageSummaryDto;
  version?: number;
  members?: Array<PCode_Application_Contracts_Dto_HeroDungeonMemberDto> | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryItemDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryItemDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeNegativePatternDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeNegativePatternDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto';
export type PCode_Application_Contracts_Dto_ProjectKnowledgeOverviewDto = {
  projectKey: string;
  projectName: string;
  projectPath: string;
  projectSummary?: string | null;
  updatedAtUtc?: string;
  stats: PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto;
  candidateMemories?: Array<PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryItemDto> | null;
  acceptedMemories?: Array<PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryItemDto> | null;
  negativePatterns?: Array<PCode_Application_Contracts_Dto_ProjectKnowledgeNegativePatternDto> | null;
};


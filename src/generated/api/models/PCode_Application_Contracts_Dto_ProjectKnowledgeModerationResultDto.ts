/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryActionDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryActionDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto';
export type PCode_Application_Contracts_Dto_ProjectKnowledgeModerationResultDto = {
  memoryId: string;
  action?: PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryActionDto;
  previousStatus?: PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto;
  currentStatus?: PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto;
  updatedAtUtc?: string;
  stats: PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto;
};


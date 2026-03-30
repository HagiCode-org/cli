/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeCorrectionDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeCorrectionDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeGraphEdgeDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeGraphEdgeDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeGraphNodeDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeGraphNodeDto';
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto';
export type PCode_Application_Contracts_Dto_ProjectKnowledgeGraphDto = {
  projectKey: string;
  updatedAtUtc?: string;
  stats: PCode_Application_Contracts_Dto_ProjectKnowledgeStatsDto;
  nodes?: Array<PCode_Application_Contracts_Dto_ProjectKnowledgeGraphNodeDto> | null;
  edges?: Array<PCode_Application_Contracts_Dto_ProjectKnowledgeGraphEdgeDto> | null;
  corrections?: Array<PCode_Application_Contracts_Dto_ProjectKnowledgeCorrectionDto> | null;
};


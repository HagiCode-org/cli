/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto';
export type PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryItemDto = {
  memoryId: string;
  status?: PCode_Application_Contracts_Dto_ProjectKnowledgeMemoryStatusDto;
  title: string;
  summary: string;
  locale: string;
  originalChiefComplaint?: string | null;
  originalDescription?: string | null;
  optimizedDescription?: string | null;
  projectSummary?: string | null;
  optimizationDirection?: string | null;
  promptVersion?: string | null;
  qualityScore?: number;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  keywords?: Array<string> | null;
  titleKeywords?: Array<string> | null;
  repositoryNames?: Array<string> | null;
  featureFlags?: Array<string> | null;
  usedMemoryIds?: Array<string> | null;
};


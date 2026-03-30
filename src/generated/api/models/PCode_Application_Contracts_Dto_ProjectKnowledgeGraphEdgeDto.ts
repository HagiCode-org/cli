/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProjectKnowledgeGraphRelationshipDto } from './PCode_Application_Contracts_Dto_ProjectKnowledgeGraphRelationshipDto';
export type PCode_Application_Contracts_Dto_ProjectKnowledgeGraphEdgeDto = {
  fromKeyword: string;
  toKeyword: string;
  locale: string;
  relationshipType?: PCode_Application_Contracts_Dto_ProjectKnowledgeGraphRelationshipDto;
  weight?: number;
  evidenceCount?: number;
  lastSeenAtUtc?: string;
};


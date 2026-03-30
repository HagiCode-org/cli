/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_AgentTemplateSummaryDto } from './PCode_Web_Controllers_AgentTemplateSummaryDto';
import type { PCode_Web_Controllers_AgentTemplateTagGroupsDto } from './PCode_Web_Controllers_AgentTemplateTagGroupsDto';
/**
 * Same-origin proxy payload for a template type index.
 */
export type PCode_Web_Controllers_AgentTemplateTypeIndexResponseDto = {
  /**
   * Optional schema version for the published type index.
   */
  version?: string | null;
  /**
   * UTC timestamp emitted by the index site when the type index was generated.
   */
  generatedAt?: string | null;
  /**
   * Stable template type identifier.
   */
  templateType?: string | null;
  /**
   * Display title for the template family.
   */
  title?: string | null;
  /**
   * Family-level description shown to frontend consumers.
   */
  description?: string | null;
  availableTagGroups?: PCode_Web_Controllers_AgentTemplateTagGroupsDto;
  /**
   * Published template summaries in this family.
   */
  templates?: Array<PCode_Web_Controllers_AgentTemplateSummaryDto> | null;
};


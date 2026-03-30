/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_AgentTemplateTagGroupsDto } from './PCode_Web_Controllers_AgentTemplateTagGroupsDto';
/**
 * Shared summary metadata for a published template.
 */
export type PCode_Web_Controllers_AgentTemplateSummaryDto = {
  /**
   * Stable template identifier.
   */
  id?: string | null;
  /**
   * Published template family.
   */
  templateType?: string | null;
  /**
   * Human-readable template name.
   */
  name?: string | null;
  /**
   * Short template summary.
   */
  summary?: string | null;
  /**
   * Stable detail path for the template JSON resource.
   */
  path?: string | null;
  /**
   * Flat tag array for search and indexing.
   */
  tags?: Array<string> | null;
  tagGroups?: PCode_Web_Controllers_AgentTemplateTagGroupsDto;
  /**
   * Short preview text suitable for an inline detail preview.
   */
  previewText?: string | null;
};


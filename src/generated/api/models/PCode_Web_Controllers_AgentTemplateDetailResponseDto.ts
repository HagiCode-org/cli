/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_AgentTemplateTagGroupsDto } from './PCode_Web_Controllers_AgentTemplateTagGroupsDto';
/**
 * Published agent template detail payload.
 */
export type PCode_Web_Controllers_AgentTemplateDetailResponseDto = {
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
  /**
   * Stable style type marker for SOUL templates.
   */
  styleType?: string | null;
  /**
   * Prompt body used to initialize Trait templates.
   */
  prompt?: string | null;
  /**
   * SOUL body used to initialize SOUL templates.
   */
  soul?: string | null;
  /**
   * Canonical owning repository for the published template.
   */
  sourceRepo?: string | null;
  /**
   * Optional source URL for the canonical template origin.
   */
  sourceUrl?: string | null;
};


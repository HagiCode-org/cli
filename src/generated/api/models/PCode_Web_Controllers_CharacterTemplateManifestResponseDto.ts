/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_CharacterTemplateSummaryDto } from './PCode_Web_Controllers_CharacterTemplateSummaryDto';
import type { PCode_Web_Controllers_CharacterTemplateTagGroupsDto } from './PCode_Web_Controllers_CharacterTemplateTagGroupsDto';
/**
 * Same-origin proxy payload for the root character template manifest.
 */
export type PCode_Web_Controllers_CharacterTemplateManifestResponseDto = {
  /**
   * Optional schema version for the published manifest.
   */
  version?: string | null;
  /**
   * UTC timestamp emitted by the index site when the manifest was generated.
   */
  generatedAt?: string | null;
  /**
   * Display title for the catalog.
   */
  title?: string | null;
  /**
   * Short description shown to frontend consumers.
   */
  description?: string | null;
  availableTagGroups?: PCode_Web_Controllers_CharacterTemplateTagGroupsDto;
  /**
   * Published character template summaries.
   */
  templates?: Array<PCode_Web_Controllers_CharacterTemplateSummaryDto> | null;
};


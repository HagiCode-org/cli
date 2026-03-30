/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_AgentTemplateManifestEntryDto } from './PCode_Web_Controllers_AgentTemplateManifestEntryDto';
/**
 * Same-origin proxy payload for the root agent template manifest.
 */
export type PCode_Web_Controllers_AgentTemplateManifestResponseDto = {
  /**
   * Optional schema version for the published manifest.
   */
  version?: string | null;
  /**
   * UTC timestamp emitted by the index site when the manifest was generated.
   */
  generatedAt?: string | null;
  /**
   * Published template type entries.
   */
  types?: Array<PCode_Web_Controllers_AgentTemplateManifestEntryDto> | null;
};


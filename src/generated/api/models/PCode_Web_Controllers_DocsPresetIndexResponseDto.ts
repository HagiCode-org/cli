/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_DocsPresetTypeEntryDto } from './PCode_Web_Controllers_DocsPresetTypeEntryDto';
/**
 * Same-origin proxy payload for docs preset index metadata.
 */
export type PCode_Web_Controllers_DocsPresetIndexResponseDto = {
  /**
   * Optional docs preset schema version.
   */
  version?: string | null;
  /**
   * Last update timestamp emitted by the docs preset index.
   */
  lastUpdated?: string | null;
  /**
   * Preset type entries keyed by provider family name.
   */
  types?: Record<string, PCode_Web_Controllers_DocsPresetTypeEntryDto> | null;
};


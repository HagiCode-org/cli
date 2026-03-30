/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_DocsPresetProviderIndexEntryDto } from './PCode_Web_Controllers_DocsPresetProviderIndexEntryDto';
/**
 * Preset type metadata from `presets/index.json`.
 */
export type PCode_Web_Controllers_DocsPresetTypeEntryDto = {
  /**
   * Relative path to the preset type folder.
   */
  path?: string | null;
  /**
   * Human-readable description of the preset type.
   */
  description?: string | null;
  /**
   * Provider entries keyed by provider id.
   */
  providers?: Record<string, PCode_Web_Controllers_DocsPresetProviderIndexEntryDto> | null;
};


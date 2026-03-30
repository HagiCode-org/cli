/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VersionAssetDto } from './PCode_Application_Contracts_Dto_VersionAssetDto';
/**
 * Represents a single version entry in the version index
 */
export type PCode_Application_Contracts_Dto_VersionIndexEntryDto = {
  /**
   * Semantic version string (e.g., "2.1.0")
   */
  version?: string | null;
  /**
   * List of file names available for this version
   */
  files?: Array<string> | null;
  /**
   * Detailed asset information with metadata
   */
  assets?: Array<PCode_Application_Contracts_Dto_VersionAssetDto> | null;
};


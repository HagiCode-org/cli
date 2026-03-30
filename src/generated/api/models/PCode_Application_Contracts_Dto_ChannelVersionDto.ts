/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VersionAssetDto } from './PCode_Application_Contracts_Dto_VersionAssetDto';
/**
 * Represents a version entry within a specific channel
 */
export type PCode_Application_Contracts_Dto_ChannelVersionDto = {
  /**
   * Semantic version string (e.g., "2.1.0" or "2.2.0-beta.3")
   */
  version?: string | null;
  /**
   * Channel this version belongs to (e.g., "stable", "beta", "preview")
   */
  channel?: string | null;
  /**
   * List of file names available for this version
   */
  files?: Array<string> | null;
  /**
   * Detailed asset information with metadata
   */
  assets?: Array<PCode_Application_Contracts_Dto_VersionAssetDto> | null;
  /**
   * Position in the channel (0 = latest)
   */
  position?: number;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Represents a single asset file in a version
 */
export type PCode_Application_Contracts_Dto_VersionAssetDto = {
  /**
   * File name (e.g., "hagicode-2.1.0-linux-x64.zip")
   */
  name?: string | null;
  /**
   * Relative path to the asset file (e.g., "2.1.0/hagicode-2.1.0-linux-x64.zip")
   */
  path?: string | null;
  /**
   * File size in bytes
   */
  size?: number;
  /**
   * Last modified timestamp in ISO 8601 format
   */
  lastModified?: string | null;
};


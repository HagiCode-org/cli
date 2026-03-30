/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_GitRepoDto } from './PCode_Application_Contracts_GitRepoDto';
/**
 * Response DTO for Git repository scan results
 */
export type PCode_Application_Contracts_ScanGitReposResponseDto = {
  /**
   * List of discovered Git repositories
   */
  repositories?: Array<PCode_Application_Contracts_GitRepoDto> | null;
  /**
   * Total number of repositories found
   */
  readonly totalCount?: number;
  /**
   * Whether the scan was successful
   */
  success?: boolean;
  /**
   * Error message if the scan failed
   */
  errorMessage?: string | null;
};


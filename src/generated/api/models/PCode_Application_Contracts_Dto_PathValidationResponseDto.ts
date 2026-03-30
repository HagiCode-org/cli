/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_PathValidationStatus } from './PCode_Application_Contracts_Dto_PathValidationStatus';
/**
 * Response DTO for project path validation
 */
export type PCode_Application_Contracts_Dto_PathValidationResponseDto = {
  /**
   * Whether the path is valid for creating a project
   */
  isValid: boolean;
  status: PCode_Application_Contracts_Dto_PathValidationStatus;
  /**
   * Human-readable message describing the validation result
   */
  message: string | null;
  /**
   * Additional details about the path type (if applicable)
   */
  pathType?: string | null;
  /**
   * Whether a valid MonoSpecs configuration was detected at the project path.
   * This is optional and only populated when the target directory exists.
   */
  hasMonoSpecsConfig?: boolean | null;
  /**
   * Full path to the detected monospecs.yaml file.
   */
  monoSpecsConfigPath?: string | null;
  /**
   * Repository directory resolved from MonoSpecs configuration.
   */
  monoSpecsRepoDirectory?: string | null;
  /**
   * Commit policy from monospecs.yaml (commit_when_archive).
   */
  monoSpecsCommitWhenArchive?: boolean | null;
};


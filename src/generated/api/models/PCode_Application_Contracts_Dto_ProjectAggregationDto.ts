/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_RepositoryAggregationDto } from './PCode_Application_Contracts_Dto_RepositoryAggregationDto';
/**
 * Project-level aggregation DTO
 */
export type PCode_Application_Contracts_Dto_ProjectAggregationDto = {
  /**
   * Project ID
   */
  id?: string;
  /**
   * Project name
   */
  name?: string | null;
  /**
   * Project path
   */
  path?: string | null;
  /**
   * Project description
   */
  description?: string | null;
  /**
   * Whether this is a MonoSpecs project
   */
  isMonoSpecs?: boolean;
  /**
   * MonoSpecs version if applicable
   */
  monoSpecsVersion?: string | null;
  /**
   * Resolved MonoSpecs repository directory if applicable
   */
  monoSpecsRepoDirectory?: string | null;
  /**
   * Whether archiving should create a Git commit for MonoSpecs projects
   */
  monoSpecsCommitWhenArchive?: boolean | null;
  /**
   * List of sub-repositories (included when available)
   */
  repositories?: Array<PCode_Application_Contracts_Dto_RepositoryAggregationDto> | null;
  /**
   * Error message if project loading failed
   */
  error?: string | null;
  /**
   * Whether there was a failure loading this project
   */
  hasError?: boolean;
};


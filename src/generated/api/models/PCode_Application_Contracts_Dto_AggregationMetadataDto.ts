/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response metadata DTO
 */
export type PCode_Application_Contracts_Dto_AggregationMetadataDto = {
  /**
   * Timestamp when the aggregation was performed
   */
  timestamp?: string;
  /**
   * Total number of projects
   */
  totalProjects?: number;
  /**
   * Total number of repositories across all projects
   */
  totalRepositories?: number;
  /**
   * Number of projects that failed to load
   */
  failedProjects?: number;
  /**
   * Whether the response contains partial data due to failures
   */
  hasFailures?: boolean;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Historical token throughput snapshot for a specific point in time
 */
export type PCode_Application_Contracts_Dto_TokenThroughputSnapshot = {
  /**
   * Timestamp of the snapshot (ISO 8601 format)
   */
  timestamp?: string;
  /**
   * Input tokens consumed at this snapshot (legacy compatibility field: regular + cache)
   */
  inputTokens: number;
  /**
   * Output tokens consumed at this snapshot
   */
  outputTokens: number;
  /**
   * Regular (non-cache) input tokens consumed at this snapshot
   */
  regularInputTokens: number;
  /**
   * Cache input tokens consumed at this snapshot
   */
  cacheInputTokens: number;
};


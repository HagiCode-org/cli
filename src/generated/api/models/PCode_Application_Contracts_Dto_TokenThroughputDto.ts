/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Token throughput statistics for real-time monitoring
 */
export type PCode_Application_Contracts_Dto_TokenThroughputDto = {
  /**
   * Input tokens consumed per minute (rate)
   */
  inputTokensPerMinute: number;
  /**
   * Output tokens generated per minute (rate)
   */
  outputTokensPerMinute: number;
  /**
   * Cumulative input tokens since service start (non-persistent)
   */
  totalInputTokens: number;
  /**
   * Cumulative output tokens since service start (non-persistent)
   */
  totalOutputTokens: number;
  /**
   * Last update timestamp
   */
  lastUpdated?: string;
  /**
   * Regular (non-cache) input tokens consumed per minute (rate)
   */
  regularInputTokensPerMinute: number;
  /**
   * Cache input tokens consumed per minute (rate)
   */
  cacheInputTokensPerMinute: number;
  /**
   * Cumulative regular (non-cache) input tokens since service start (non-persistent)
   */
  totalRegularInputTokens: number;
  /**
   * Cumulative cache input tokens since service start (non-persistent)
   */
  totalCacheInputTokens: number;
};


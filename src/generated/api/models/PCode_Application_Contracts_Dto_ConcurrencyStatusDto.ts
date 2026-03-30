/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_SessionSummaryDto } from './PCode_Application_Contracts_Dto_SessionSummaryDto';
/**
 * Response DTO for concurrency status
 */
export type PCode_Application_Contracts_Dto_ConcurrencyStatusDto = {
  /**
   * Current number of active sessions for the user
   */
  currentActiveCount?: number;
  /**
   * Maximum concurrent sessions allowed for the user
   */
  maxConcurrentLimit?: number;
  /**
   * Whether the user has a valid license
   */
  hasLicense?: boolean;
  /**
   * List of currently active sessions
   */
  activeSessions?: Array<PCode_Application_Contracts_Dto_SessionSummaryDto> | null;
};


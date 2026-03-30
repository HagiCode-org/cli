/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HealthStatus } from './PCode_Application_Contracts_Dto_HealthStatus';
/**
 * Health status of an AI provider channel (Claude Code, Codex, etc.)
 */
export type PCode_Application_Contracts_Dto_HealthStatusDto = {
  status?: PCode_Application_Contracts_Dto_HealthStatus;
  /**
   * Response time in milliseconds. Null when status is Checking or when measurement failed.
   */
  responseTimeMs?: number | null;
  /**
   * Timestamp of when the health check was performed
   */
  lastCheckTime?: string;
  /**
   * Error message if the channel is unhealthy. Null when status is Healthy.
   */
  error?: string | null;
  /**
   * Version string for the underlying provider or CLI runtime, when available.
   */
  version?: string | null;
};


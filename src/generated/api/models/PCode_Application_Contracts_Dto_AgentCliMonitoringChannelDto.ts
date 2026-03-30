/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HealthStatus } from './PCode_Application_Contracts_Dto_HealthStatus';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
/**
 * Normalized health status for a single Agent CLI monitoring channel.
 */
export type PCode_Application_Contracts_Dto_AgentCliMonitoringChannelDto = {
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
  /**
   * Stable Agent CLI identifier used by frontend rendering and caching.
   */
  cliId?: string | null;
  /**
   * Human-readable display name for the Agent CLI tool.
   */
  displayName?: string | null;
  providerType?: PCode_Models_AIProviderType;
  /**
   * Backend-defined display ordering for compact frontend rendering.
   */
  displayOrder?: number;
};


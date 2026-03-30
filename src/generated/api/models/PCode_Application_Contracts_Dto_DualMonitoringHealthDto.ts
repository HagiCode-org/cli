/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AgentCliMonitoringChannelDto } from './PCode_Application_Contracts_Dto_AgentCliMonitoringChannelDto';
import type { PCode_Application_Contracts_Dto_HealthStatus } from './PCode_Application_Contracts_Dto_HealthStatus';
import type { PCode_Application_Contracts_Dto_HealthStatusDto } from './PCode_Application_Contracts_Dto_HealthStatusDto';
/**
 * Aggregated health status for Agent CLI monitoring channels.
 * This DTO keeps the legacy Claude Code, Codex, and Copilot fields for compatibility
 * while also exposing a normalized dynamic channel collection for extensible frontend consumers.
 */
export type PCode_Application_Contracts_Dto_DualMonitoringHealthDto = {
  claudeCode?: PCode_Application_Contracts_Dto_HealthStatusDto;
  codex?: PCode_Application_Contracts_Dto_HealthStatusDto;
  copilot?: PCode_Application_Contracts_Dto_HealthStatusDto;
  overallStatus?: PCode_Application_Contracts_Dto_HealthStatus;
  /**
   * Normalized monitoring channels ordered for frontend display.
   * Additional Agent CLI tools beyond the legacy trio are exposed here.
   */
  channels?: Array<PCode_Application_Contracts_Dto_AgentCliMonitoringChannelDto> | null;
  /**
   * UTC timestamp when the monitoring check completed.
   */
  checkedAtUtc?: string;
};


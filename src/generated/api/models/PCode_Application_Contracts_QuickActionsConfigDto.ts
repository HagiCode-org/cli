/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_QuickActionConfigItemDto } from './PCode_Application_Contracts_QuickActionConfigItemDto';
/**
 * DTO for available quick actions configuration
 */
export type PCode_Application_Contracts_QuickActionsConfigDto = {
  /**
   * List of available commands
   */
  commands?: Array<PCode_Application_Contracts_QuickActionConfigItemDto> | null;
  /**
   * Default timeout in seconds
   */
  defaultTimeoutSeconds?: number;
  /**
   * Maximum output size in bytes
   */
  maxOutputSizeBytes?: number;
};


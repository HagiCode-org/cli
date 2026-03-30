/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_DeploymentInfoDto } from './PCode_Application_Contracts_Dto_DeploymentInfoDto';
/**
 * Complete version information for the PCode platform
 */
export type PCode_Application_Contracts_Dto_VersionInfoDto = {
  /**
   * PCode product version (e.g., "v1.2.3")
   */
  productVersion?: string | null;
  /**
   * Build timestamp (UTC), null if unavailable
   */
  buildDate?: string | null;
  deploymentInfo?: PCode_Application_Contracts_Dto_DeploymentInfoDto;
};


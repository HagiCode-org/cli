/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_EnvironmentCapabilitiesDto } from './PCode_Application_Contracts_Dto_EnvironmentCapabilitiesDto';
/**
 * Deployment environment information
 */
export type PCode_Application_Contracts_Dto_DeploymentInfoDto = {
  /**
   * Deployment type (Docker, LocalDevelopment, DirectDeployment, Unknown)
   */
  deploymentType?: string | null;
  /**
   * Whether running in container environment (backward compatibility)
   */
  isContainer?: boolean;
  capabilities?: PCode_Application_Contracts_Dto_EnvironmentCapabilitiesDto;
};


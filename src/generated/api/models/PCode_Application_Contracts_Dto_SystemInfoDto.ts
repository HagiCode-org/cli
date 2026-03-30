/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_DeploymentInfoDto } from './PCode_Application_Contracts_Dto_DeploymentInfoDto';
import type { PCode_Application_Contracts_Dto_DocumentSubjectThemeDto } from './PCode_Application_Contracts_Dto_DocumentSubjectThemeDto';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
/**
 * System information about the PCode platform runtime environment
 */
export type PCode_Application_Contracts_Dto_SystemInfoDto = {
  /**
   * Whether the application is running in a containerized environment (e.g., Docker)
   */
  isContainer?: boolean;
  /**
   * GitHub OAuth Client ID from backend configuration.
   * Null when GitHub OAuth is not configured.
   */
  gitHubClientId?: string | null;
  /**
   * Official Discord community invite link from backend configuration.
   * Null when the community link is not configured.
   */
  discordLink?: string | null;
  deploymentInfo?: PCode_Application_Contracts_Dto_DeploymentInfoDto;
  defaultExecutorType?: PCode_Models_AIProviderType;
  /**
   * Backend configured default document-subject theme identifier.
   */
  defaultDocumentSubjectThemeId?: string | null;
  /**
   * Enabled document-subject theme catalog metadata.
   */
  documentSubjectThemes?: Array<PCode_Application_Contracts_Dto_DocumentSubjectThemeDto> | null;
};


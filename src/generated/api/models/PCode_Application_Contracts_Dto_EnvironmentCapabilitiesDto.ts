/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Environment capabilities DTO
 */
export type PCode_Application_Contracts_Dto_EnvironmentCapabilitiesDto = {
  /**
   * Operating system platform (windows, macos, linux)
   */
  platform?: string | null;
  /**
   * Container mount path
   */
  containerMountPath?: string | null;
  /**
   * Whether container first-run check is enabled
   */
  containerFirstRunEnabled?: boolean | null;
  /**
   * Whether the application has write access to project root directory
   */
  hasWriteAccessToProjectRoot?: boolean | null;
  /**
   * Whether Git is installed
   */
  hasGitInstalled?: boolean | null;
  /**
   * Whether VS Code is installed
   */
  hasVsCodeInstalled?: boolean | null;
};


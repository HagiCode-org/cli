/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Individual quick action configuration item
 */
export type PCode_Application_Contracts_QuickActionConfigItemDto = {
  /**
   * Action type identifier
   */
  actionType?: string | null;
  /**
   * Display name
   */
  displayName?: string | null;
  /**
   * Description of what the command does
   */
  description?: string | null;
  /**
   * Command category
   */
  category?: string | null;
  /**
   * Whether this command requires a sub-path
   */
  requiresSubPath?: boolean;
  /**
   * Maximum timeout for this command
   */
  timeoutSeconds?: number;
};


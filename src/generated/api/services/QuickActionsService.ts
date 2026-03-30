/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_QuickActionCommandDto } from '../models/PCode_Application_Contracts_Dto_QuickActionCommandDto';
import type { PCode_Application_Contracts_Dto_QuickActionResponseDto } from '../models/PCode_Application_Contracts_Dto_QuickActionResponseDto';
import type { PCode_Application_Contracts_QuickActionsConfigDto } from '../models/PCode_Application_Contracts_QuickActionsConfigDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class QuickActionsService {
  /**
   * Execute a quick action command
   * Executes a quick action command and returns the result.
   * Supports commands like open-vscode, ai-compose, new-proposal, etc.
   * Commands are validated against a whitelist for security.
   * @returns PCode_Application_Contracts_Dto_QuickActionResponseDto Command executed successfully
   * @throws ApiError
   */
  public static postApiQuickActionsExecute({
    requestBody,
  }: {
    /**
     * The command execution request
     */
    requestBody?: PCode_Application_Contracts_Dto_QuickActionCommandDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_QuickActionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/QuickActions/execute',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request parameters`,
        403: `User lacks permission`,
        408: `Command execution timed out`,
        500: `Internal server error`,
      },
    });
  }
  /**
   * Get available quick action commands
   * Returns the whitelist of commands that can be executed.
   * Includes command metadata such as display name, description, timeout, etc.
   * @returns PCode_Application_Contracts_QuickActionsConfigDto Successfully retrieved command configurations
   * @throws ApiError
   */
  public static getApiQuickActionsConfigs(): CancelablePromise<PCode_Application_Contracts_QuickActionsConfigDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/QuickActions/configs',
    });
  }
}

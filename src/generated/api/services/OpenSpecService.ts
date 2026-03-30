/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_OpenSpecChangesListResponseDto } from '../models/PCode_Application_Contracts_Dto_OpenSpecChangesListResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OpenSpecService {
  /**
   * Get list of existing OpenSpec change folders
   * @returns PCode_Application_Contracts_Dto_OpenSpecChangesListResponseDto Returns the list of folders
   * @throws ApiError
   */
  public static getApiOpenspecChanges({
    projectId,
    projectPath,
    includeArchived = false,
  }: {
    /**
     * Optional project ID to filter folders. If provided, the project path will be looked up.
     */
    projectId?: string,
    /**
     * Optional project path to filter folders (deprecated: use projectId instead).
     */
    projectPath?: string,
    /**
     * Whether to include archived folders (default: false)
     */
    includeArchived?: boolean,
  }): CancelablePromise<PCode_Application_Contracts_Dto_OpenSpecChangesListResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/openspec/changes',
      query: {
        'projectId': projectId,
        'projectPath': projectPath,
        'includeArchived': includeArchived,
      },
      errors: {
        400: `Bad request if project ID/path is invalid`,
        404: `If the openspec/changes directory doesn't exist`,
        500: `Internal server error`,
      },
    });
  }
}

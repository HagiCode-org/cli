/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_PromptDTO } from '../models/PCode_Application_DTOs_PromptDTO';
import type { PCode_Application_DTOs_PromptImageRefreshRequest } from '../models/PCode_Application_DTOs_PromptImageRefreshRequest';
import type { PCode_Application_DTOs_PromptImageRefreshResponseDto } from '../models/PCode_Application_DTOs_PromptImageRefreshResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PromptsService {
  /**
   * Gets a list of all available prompts
   * @returns PCode_Application_DTOs_PromptDTO Returns the list of prompts
   * @throws ApiError
   */
  public static getApiPrompts({
    tag,
  }: {
    /**
     * Optional tag to filter prompts by
     */
    tag?: string,
  }): CancelablePromise<Array<PCode_Application_DTOs_PromptDTO>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Prompts',
      query: {
        'tag': tag,
      },
    });
  }
  /**
   * Refreshes prompt image summaries for all prompts or a selected subset.
   * @returns PCode_Application_DTOs_PromptImageRefreshResponseDto OK
   * @throws ApiError
   */
  public static postApiPromptsImagesRefresh({
    requestBody,
  }: {
    /**
     * Optional prompt selection payload.
     */
    requestBody?: PCode_Application_DTOs_PromptImageRefreshRequest,
  }): CancelablePromise<PCode_Application_DTOs_PromptImageRefreshResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Prompts/images/refresh',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}

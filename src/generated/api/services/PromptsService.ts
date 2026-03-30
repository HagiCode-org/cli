/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_PromptDetailDTO } from '../models/PCode_Application_DTOs_PromptDetailDTO';
import type { PCode_Application_DTOs_PromptDTO } from '../models/PCode_Application_DTOs_PromptDTO';
import type { PCode_Application_DTOs_PromptImageRefreshRequest } from '../models/PCode_Application_DTOs_PromptImageRefreshRequest';
import type { PCode_Application_DTOs_PromptImageRefreshResponseDto } from '../models/PCode_Application_DTOs_PromptImageRefreshResponseDto';
import type { PCode_Application_DTOs_SavePromptRequest } from '../models/PCode_Application_DTOs_SavePromptRequest';
import type { PCode_Application_DTOs_ValidationResult } from '../models/PCode_Application_DTOs_ValidationResult';
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
  /**
   * Gets detailed information for a specific prompt
   * @returns PCode_Application_DTOs_PromptDetailDTO Returns the prompt details
   * @throws ApiError
   */
  public static getApiPrompts1({
    id,
  }: {
    /**
     * The prompt ID (format: "scenario.locale")
     */
    id: string,
  }): CancelablePromise<PCode_Application_DTOs_PromptDetailDTO> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Prompts/{id}',
      path: {
        'id': id,
      },
      errors: {
        404: `If the prompt is not found`,
      },
    });
  }
  /**
   * Saves a prompt to the OverridePrompts directory
   * @returns PCode_Application_DTOs_PromptDetailDTO Returns the saved prompt
   * @throws ApiError
   */
  public static postApiPrompts({
    id,
    requestBody,
  }: {
    /**
     * The prompt ID (format: "scenario.locale")
     */
    id: string,
    /**
     * The save request with template and metadata
     */
    requestBody?: PCode_Application_DTOs_SavePromptRequest,
  }): CancelablePromise<PCode_Application_DTOs_PromptDetailDTO> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Prompts/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `If validation fails`,
      },
    });
  }
  /**
   * Deletes an override prompt, reverting to the default
   * @returns void
   * @throws ApiError
   */
  public static deleteApiPromptsOverride({
    id,
  }: {
    /**
     * The prompt ID (format: "scenario.locale")
     */
    id: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Prompts/{id}/override',
      path: {
        'id': id,
      },
      errors: {
        404: `If no override exists for the prompt`,
      },
    });
  }
  /**
   * Validates a prompt without saving
   * @returns PCode_Application_DTOs_ValidationResult Returns the validation result
   * @throws ApiError
   */
  public static postApiPromptsValidate({
    id,
    requestBody,
  }: {
    /**
     * The prompt ID (format: "scenario.locale")
     */
    id: string,
    /**
     * The save request to validate
     */
    requestBody?: PCode_Application_DTOs_SavePromptRequest,
  }): CancelablePromise<PCode_Application_DTOs_ValidationResult> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Prompts/{id}/validate',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Previews a prompt rendering with sample data
   * @returns string Returns the rendered prompt
   * @throws ApiError
   */
  public static postApiPromptsPreview({
    id,
    requestBody,
  }: {
    /**
     * The prompt ID (format: "scenario.locale")
     */
    id: string,
    /**
     * The sample data to render with
     */
    requestBody?: any,
  }): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Prompts/{id}/preview',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `If the prompt is not found or rendering fails`,
      },
    });
  }
  /**
   * Undoes the last saved version of a prompt
   * @returns PCode_Application_DTOs_PromptDetailDTO Returns the restored prompt
   * @throws ApiError
   */
  public static postApiPromptsUndo({
    id,
  }: {
    /**
     * The prompt ID (format: "scenario.locale")
     */
    id: string,
  }): CancelablePromise<PCode_Application_DTOs_PromptDetailDTO> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Prompts/{id}/undo',
      path: {
        'id': id,
      },
      errors: {
        404: `If no backup exists`,
      },
    });
  }
}

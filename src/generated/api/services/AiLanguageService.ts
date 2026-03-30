/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AILanguageResponseDto } from '../models/PCode_Application_Contracts_Dto_AILanguageResponseDto';
import type { PCode_Application_Contracts_Dto_SetAILanguageRequestDto } from '../models/PCode_Application_Contracts_Dto_SetAILanguageRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AiLanguageService {
  /**
   * Sets the AI language preference for content generation.
   * Supported language values:
   * - "follow": Follow interface language (default)
   * - "zh-CN": Always use Chinese
   * - "en-US": Always use English
   * When using "follow" mode, include currentInterfaceLanguage for reference.
   * @returns PCode_Application_Contracts_Dto_AILanguageResponseDto Language preference set successfully
   * @throws ApiError
   */
  public static postApiSystemAiLanguage({
    requestBody,
  }: {
    /**
     * The language preference request
     */
    requestBody?: PCode_Application_Contracts_Dto_SetAILanguageRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_AILanguageResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/system/ai-language',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid language code`,
        500: `Internal server error`,
      },
    });
  }
  /**
   * Gets the current AI language preference.
   * Returns the current AI language preference setting.
   * Null value indicates "follow" mode (follow interface language).
   * @returns PCode_Application_Contracts_Dto_AILanguageResponseDto Language preference retrieved successfully
   * @throws ApiError
   */
  public static getApiSystemAiLanguage(): CancelablePromise<PCode_Application_Contracts_Dto_AILanguageResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/system/ai-language',
      errors: {
        500: `Internal server error`,
      },
    });
  }
  /**
   * Gets the last known interface language (only relevant if AI language preference is "follow").
   * @returns any Last known interface language retrieved successfully
   * @throws ApiError
   */
  public static getApiSystemAiLanguageLastKnownInterface(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/system/ai-language/last-known-interface',
      errors: {
        500: `Internal server error`,
      },
    });
  }
  /**
   * Gets the effective AI language to use based on preference and interface language.
   * @returns any Effective AI language retrieved successfully
   * @throws ApiError
   */
  public static getApiSystemAiLanguageEffective(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/system/ai-language/effective',
      errors: {
        500: `Internal server error`,
      },
    });
  }
}

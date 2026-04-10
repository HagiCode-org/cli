/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_FrontendConfigResponseDto } from '../models/PCode_Application_Contracts_Dto_FrontendConfigResponseDto';
import type { PCode_Application_Contracts_Dto_MigrateFrontendConfigRequestDto } from '../models/PCode_Application_Contracts_Dto_MigrateFrontendConfigRequestDto';
import type { PCode_Application_Contracts_Dto_UpdateFrontendConfigRequestDto } from '../models/PCode_Application_Contracts_Dto_UpdateFrontendConfigRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FrontendConfigService {
  /**
   * @returns PCode_Application_Contracts_Dto_FrontendConfigResponseDto OK
   * @throws ApiError
   */
  public static getApiFrontendConfig(): CancelablePromise<PCode_Application_Contracts_Dto_FrontendConfigResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/frontend-config',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_FrontendConfigResponseDto OK
   * @throws ApiError
   */
  public static putApiFrontendConfig({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UpdateFrontendConfigRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_FrontendConfigResponseDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/frontend-config',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_FrontendConfigResponseDto OK
   * @throws ApiError
   */
  public static postApiFrontendConfigMigrate({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_MigrateFrontendConfigRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_FrontendConfigResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/frontend-config/migrate',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        500: `Internal Server Error`,
      },
    });
  }
}

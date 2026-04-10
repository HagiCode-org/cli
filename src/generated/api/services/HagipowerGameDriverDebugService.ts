/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HagipowerGameDriverDebugSettingsDto } from '../models/PCode_Application_Contracts_Dto_HagipowerGameDriverDebugSettingsDto';
import type { PCode_Application_Contracts_Dto_UpdateHagipowerGameDriverDebugSettingsRequestDto } from '../models/PCode_Application_Contracts_Dto_UpdateHagipowerGameDriverDebugSettingsRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HagipowerGameDriverDebugService {
  /**
   * @returns PCode_Application_Contracts_Dto_HagipowerGameDriverDebugSettingsDto OK
   * @throws ApiError
   */
  public static getApiSystemHagipowerGameDriverDebug(): CancelablePromise<PCode_Application_Contracts_Dto_HagipowerGameDriverDebugSettingsDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/system/hagipower-game-driver/debug',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HagipowerGameDriverDebugSettingsDto OK
   * @throws ApiError
   */
  public static putApiSystemHagipowerGameDriverDebug({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UpdateHagipowerGameDriverDebugSettingsRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HagipowerGameDriverDebugSettingsDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/system/hagipower-game-driver/debug',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        500: `Internal Server Error`,
      },
    });
  }
}

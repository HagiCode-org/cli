/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HagipowerDebugStateDto } from '../models/PCode_Application_Contracts_Dto_HagipowerDebugStateDto';
import type { PCode_Application_Contracts_Dto_UpdateHagipowerDebugStateRequestDto } from '../models/PCode_Application_Contracts_Dto_UpdateHagipowerDebugStateRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HagipowerDebugService {
  /**
   * @returns PCode_Application_Contracts_Dto_HagipowerDebugStateDto OK
   * @throws ApiError
   */
  public static getApiSystemHagipowerDebug(): CancelablePromise<PCode_Application_Contracts_Dto_HagipowerDebugStateDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/system/hagipower/debug',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HagipowerDebugStateDto OK
   * @throws ApiError
   */
  public static putApiSystemHagipowerDebug({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UpdateHagipowerDebugStateRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HagipowerDebugStateDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/system/hagipower/debug',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        500: `Internal Server Error`,
      },
    });
  }
}

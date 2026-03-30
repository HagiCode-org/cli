/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VersionInfoDto } from '../models/PCode_Application_Contracts_Dto_VersionInfoDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VersionInfoService {
  /**
   * Gets version information for the PCode platform and environment tools
   * @returns PCode_Application_Contracts_Dto_VersionInfoDto OK
   * @throws ApiError
   */
  public static getApiAppVersionInfo(): CancelablePromise<PCode_Application_Contracts_Dto_VersionInfoDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/app/version-info',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
}

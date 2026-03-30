/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroSystemSettingsDto } from '../models/PCode_Application_Contracts_Dto_HeroSystemSettingsDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SystemInfoService {
  /**
   * Gets the centralized hero profession catalog merged with the current user's custom secondary branches.
   * @returns PCode_Application_Contracts_Dto_HeroSystemSettingsDto OK
   * @throws ApiError
   */
  public static getApiSystemInfoHeroSettings(): CancelablePromise<PCode_Application_Contracts_Dto_HeroSystemSettingsDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/SystemInfo/hero-settings',
    });
  }
}

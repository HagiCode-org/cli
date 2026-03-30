/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ConcurrencyStatusDto } from '../models/PCode_Application_Contracts_Dto_ConcurrencyStatusDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ConcurrencyService {
  /**
   * Gets the current concurrency status for the current user
   * @returns PCode_Application_Contracts_Dto_ConcurrencyStatusDto OK
   * @throws ApiError
   */
  public static getApiConcurrencyStatus(): CancelablePromise<PCode_Application_Contracts_Dto_ConcurrencyStatusDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/concurrency/status',
    });
  }
  /**
   * Gets the maximum concurrent sessions allowed for the current user
   * @returns number OK
   * @throws ApiError
   */
  public static getApiConcurrencyLimit(): CancelablePromise<number> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/concurrency/limit',
    });
  }
}

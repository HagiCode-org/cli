/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_TokenThroughputDto } from '../models/PCode_Application_Contracts_Dto_TokenThroughputDto';
import type { PCode_Application_Contracts_Dto_TokenThroughputSnapshot } from '../models/PCode_Application_Contracts_Dto_TokenThroughputSnapshot';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TokenThroughputService {
  /**
   * Gets the current token throughput statistics for the current user
   * @returns PCode_Application_Contracts_Dto_TokenThroughputDto OK
   * @throws ApiError
   */
  public static getApiTokenThroughputStatistics(): CancelablePromise<PCode_Application_Contracts_Dto_TokenThroughputDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/token-throughput/statistics',
    });
  }
  /**
   * Gets historical token throughput snapshots for the specified time range
   * @returns PCode_Application_Contracts_Dto_TokenThroughputSnapshot OK
   * @throws ApiError
   */
  public static getApiTokenThroughputHistory({
    minutes = 30,
  }: {
    /**
     * Number of minutes of history to retrieve (default: 30, max: 60)
     */
    minutes?: number,
  }): CancelablePromise<Array<PCode_Application_Contracts_Dto_TokenThroughputSnapshot>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/token-throughput/history',
      query: {
        'minutes': minutes,
      },
    });
  }
}

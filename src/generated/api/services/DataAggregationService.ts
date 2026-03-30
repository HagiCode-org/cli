/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_DataAggregationResponseDto } from '../models/PCode_Application_Contracts_Dto_DataAggregationResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DataAggregationService {
  /**
   * Gets aggregated data
   * Retrieves hierarchical data including projects and repositories.
   * @returns PCode_Application_Contracts_Dto_DataAggregationResponseDto Returns aggregated data successfully
   * @throws ApiError
   */
  public static getApiDataAggregation(): CancelablePromise<PCode_Application_Contracts_Dto_DataAggregationResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/DataAggregation',
      errors: {
        400: `Depth parameter is no longer supported`,
      },
    });
  }
}

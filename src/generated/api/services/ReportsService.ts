/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroBattleReportDto } from '../models/PCode_Application_Contracts_Dto_HeroBattleReportDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ReportsService {
  /**
   * Gets the aggregated hero battle report for the specified day.
   * @returns PCode_Application_Contracts_Dto_HeroBattleReportDto Hero battle report retrieved successfully
   * @throws ApiError
   */
  public static getApiReportsHeroBattle({
    date,
  }: {
    /**
     * Report date in ISO format (yyyy-MM-dd). Defaults to yesterday UTC when omitted.
     */
    date?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroBattleReportDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Reports/hero-battle',
      query: {
        'date': date,
      },
      errors: {
        400: `Invalid date format`,
        500: `Failed to retrieve the hero battle report`,
      },
    });
  }
}

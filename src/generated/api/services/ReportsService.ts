/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HagipowerStatisticsReportDto } from '../models/PCode_Application_Contracts_Dto_HagipowerStatisticsReportDto';
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
  /**
   * Gets the 10-minute bucketed HagiPower history report derived from minute snapshots in an independent SQLite database.
   * History starts accumulating only after this feature is enabled and does not backfill older balances.
   * @returns PCode_Application_Contracts_Dto_HagipowerStatisticsReportDto HagiPower history report retrieved successfully
   * @throws ApiError
   */
  public static getApiReportsHagipowerHistory({
    range,
    heroId,
  }: {
    /**
     * Supported values: 1h, 6h, 24h, 7d. Defaults to 24h when omitted.
     */
    range?: string,
    /**
     * Optional hero identifier. When omitted, the report returns the default focus hero.
     */
    heroId?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HagipowerStatisticsReportDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Reports/hagipower-history',
      query: {
        'range': range,
        'heroId': heroId,
      },
      errors: {
        400: `Invalid range parameter`,
        500: `Failed to retrieve the HagiPower history report`,
      },
    });
  }
}

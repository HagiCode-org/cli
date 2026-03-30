/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_BasicHealthStatusDto } from '../models/PCode_Application_Contracts_Dto_BasicHealthStatusDto';
import type { PCode_Application_Contracts_Dto_DualMonitoringHealthDto } from '../models/PCode_Application_Contracts_Dto_DualMonitoringHealthDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HealthService {
  /**
   * Gets the monitoring health status for Claude Code, Codex, and Copilot channels.
   * This endpoint performs health checks on Claude Code, Codex, and GitHub Copilot providers.
   * If one channel fails, the response still includes the healthy channel's data.
   *
   * Possible health statuses per channel:
   * - Healthy: Provider is responding normally
   * - Unhealthy: Provider is not responding or an error occurred
   * @returns PCode_Application_Contracts_Dto_DualMonitoringHealthDto Health check completed successfully. Returns dual channel health status in the response body.
   * @throws ApiError
   */
  public static getApiHealthDualMonitoring({
    executorIds,
  }: {
    /**
     * Optional comma-separated list of executor IDs to filter the health check.
     * If not provided, all registered executors will be checked.
     */
    executorIds?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DualMonitoringHealthDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/health/dual-monitoring',
      query: {
        'executorIds': executorIds,
      },
    });
  }
  /**
   * Gets the basic health status of the PCode.Web service.
   * This is a lightweight liveness probe that returns immediately without checking
   * external dependencies (database, Orleans, external APIs). Use this endpoint for:
   * - Kubernetes livenessProbe
   * - Docker HEALTHCHECK instruction
   * - CircleCI deployment verification
   * - Load balancer health checks
   *
   * For dependency health checks, use /api/health/dual-monitoring instead.
   * @returns PCode_Application_Contracts_Dto_BasicHealthStatusDto Service is healthy and running.
   * @throws ApiError
   */
  public static getApiHealth(): CancelablePromise<PCode_Application_Contracts_Dto_BasicHealthStatusDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/health',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
}

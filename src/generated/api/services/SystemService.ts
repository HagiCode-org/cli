/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ContainerSettingsDto } from '../models/PCode_Application_Contracts_Dto_ContainerSettingsDto';
import type { PCode_Application_Contracts_Dto_DeploymentInfoDto } from '../models/PCode_Application_Contracts_Dto_DeploymentInfoDto';
import type { PCode_Application_Contracts_Dto_RssFeedResponseDto } from '../models/PCode_Application_Contracts_Dto_RssFeedResponseDto';
import type { PCode_Application_Contracts_Dto_SystemInfoDto } from '../models/PCode_Application_Contracts_Dto_SystemInfoDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SystemService {
  /**
   * Gets system information about the current runtime environment.
   * This endpoint returns environment information such as whether the application
   * is running in a containerized environment (Docker, etc.) and the GitHub OAuth Client ID
   * from backend configuration.
   * The environment detection is performed once at application startup and cached.
   * @returns PCode_Application_Contracts_Dto_SystemInfoDto System information retrieved successfully.
   * @throws ApiError
   */
  public static getApiSystemInfo(): CancelablePromise<PCode_Application_Contracts_Dto_SystemInfoDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/System/info',
    });
  }
  /**
   * Gets container configuration settings for first-run project discovery.
   * This endpoint returns the container configuration used for first-run project discovery.
   * The mount path is used as the default scan location when detecting Git repositories.
   * The first-run check enabled flag controls whether the first-run flow is activated.
   * @returns PCode_Application_Contracts_Dto_ContainerSettingsDto Container settings retrieved successfully.
   * @throws ApiError
   */
  public static getApiSystemContainerSettings(): CancelablePromise<PCode_Application_Contracts_Dto_ContainerSettingsDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/System/container-settings',
    });
  }
  /**
   * Gets deployment environment information.
   * This endpoint returns detailed deployment environment information including:
   * - Deployment type (Docker, LocalDevelopment, DirectDeployment, Unknown)
   * - Container detection status (backward compatibility)
   * - Environment capabilities (platform, tools availability, etc.)
   * @returns PCode_Application_Contracts_Dto_DeploymentInfoDto Deployment information retrieved successfully.
   * @throws ApiError
   */
  public static getApiSystemDeploymentInfo(): CancelablePromise<PCode_Application_Contracts_Dto_DeploymentInfoDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/System/deployment-info',
    });
  }
  /**
   * Gets the latest RSS feed items from the configured blog feed.
   * This endpoint fetches blog posts from the configured RSS feed URL.
   * Results are cached for 24 hours to reduce external requests.
   * If the RSS feed is unavailable, returns an empty list.
   * @returns PCode_Application_Contracts_Dto_RssFeedResponseDto RSS feed items retrieved successfully.
   * @throws ApiError
   */
  public static getApiSystemRssFeed(): CancelablePromise<PCode_Application_Contracts_Dto_RssFeedResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/System/rss/feed',
      errors: {
        500: `Error fetching RSS feed.`,
      },
    });
  }
}

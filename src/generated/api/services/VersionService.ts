/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ChannelVersionDto } from '../models/PCode_Application_Contracts_Dto_ChannelVersionDto';
import type { PCode_Application_Contracts_Dto_VersionIndexDto } from '../models/PCode_Application_Contracts_Dto_VersionIndexDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VersionService {
  /**
   * Gets the latest version for a specific channel
   * @returns PCode_Application_Contracts_Dto_ChannelVersionDto OK
   * @throws ApiError
   */
  public static getApiVersionLatest({
    channel = 'stable',
  }: {
    /**
     * Channel name (e.g., "stable", "beta", "preview"). Defaults to "stable".
     */
    channel?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ChannelVersionDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/version/latest',
      query: {
        'channel': channel,
      },
      errors: {
        404: `Not Found`,
      },
    });
  }
  /**
   * Gets all available channel names
   * @returns string OK
   * @throws ApiError
   */
  public static getApiVersionChannels(): CancelablePromise<Array<string>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/version/channels',
    });
  }
  /**
   * Gets all versions for a specific channel
   * @returns PCode_Application_Contracts_Dto_ChannelVersionDto OK
   * @throws ApiError
   */
  public static getApiVersionVersions({
    channel = 'stable',
  }: {
    /**
     * Channel name (e.g., "stable", "beta", "preview"). Defaults to "stable".
     */
    channel?: string,
  }): CancelablePromise<Array<PCode_Application_Contracts_Dto_ChannelVersionDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/version/versions',
      query: {
        'channel': channel,
      },
      errors: {
        404: `Not Found`,
      },
    });
  }
  /**
   * Gets the complete version index with all channels
   * @returns PCode_Application_Contracts_Dto_VersionIndexDto OK
   * @throws ApiError
   */
  public static getApiVersionIndex(): CancelablePromise<PCode_Application_Contracts_Dto_VersionIndexDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/version/index',
      errors: {
        404: `Not Found`,
      },
    });
  }
  /**
   * Validates that versions in a channel are in correct descending order
   * @returns boolean OK
   * @throws ApiError
   */
  public static getApiVersionValidate({
    channel,
  }: {
    /**
     * Channel name to validate
     */
    channel?: string,
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/version/validate',
      query: {
        'channel': channel,
      },
    });
  }
}

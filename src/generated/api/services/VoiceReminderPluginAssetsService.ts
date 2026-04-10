/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VoiceReminderPluginAssetsService {
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static getSound({
    assetFile,
  }: {
    assetFile: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/sound/{assetFile}',
      path: {
        'assetFile': assetFile,
      },
    });
  }
}

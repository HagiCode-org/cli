/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AdventureContentPluginAssetsService {
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static getHagipowerAdventurePluginsLocalesJson({
    pluginId,
    locale,
  }: {
    pluginId: string,
    locale: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/hagipower-adventure-plugins/{pluginId}/locales/{locale}.json',
      path: {
        'pluginId': pluginId,
        'locale': locale,
      },
    });
  }
}

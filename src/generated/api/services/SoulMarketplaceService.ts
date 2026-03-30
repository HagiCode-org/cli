/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SoulMarketplaceService {
  /**
   * @returns void
   * @throws ApiError
   */
  public static getApiSoulMarketplaceItems(): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/soul-marketplace/items',
      errors: {
        410: `Gone`,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static getApiSoulMarketplaceItems1({
    soulCatalogId,
  }: {
    soulCatalogId: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/soul-marketplace/items/{soulCatalogId}',
      path: {
        'soulCatalogId': soulCatalogId,
      },
      errors: {
        410: `Gone`,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static getApiSoulMarketplaceFavorites(): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/soul-marketplace/favorites',
      errors: {
        410: `Gone`,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static postApiSoulMarketplaceFavorites({
    soulCatalogId,
  }: {
    soulCatalogId: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/soul-marketplace/favorites/{soulCatalogId}',
      path: {
        'soulCatalogId': soulCatalogId,
      },
      errors: {
        410: `Gone`,
      },
    });
  }
}

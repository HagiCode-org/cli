/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TraitMarketplaceService {
  /**
   * @returns void
   * @throws ApiError
   */
  public static getApiTraitMarketplace(): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/trait-marketplace',
      errors: {
        410: `Gone`,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static getApiTraitMarketplace1({
    traitCatalogId,
  }: {
    traitCatalogId: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/trait-marketplace/{traitCatalogId}',
      path: {
        'traitCatalogId': traitCatalogId,
      },
      errors: {
        410: `Gone`,
      },
    });
  }
}

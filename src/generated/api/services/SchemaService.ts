/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SchemaService {
  /**
   * Gets the deprecated AppSettings JSON Schema endpoint.
   * @returns string Returns the schema when compatibility mode is enabled
   * @throws ApiError
   */
  public static getApiSchemaAppsettings(): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Schema/appsettings',
      errors: {
        304: `Schema not modified (ETag match)`,
        404: `Schema file not found`,
        410: `Endpoint deprecated`,
      },
    });
  }
  /**
   * Gets the environment variable manifest used by Desktop for env-driven configuration.
   * @returns string Returns the manifest
   * @throws ApiError
   */
  public static getApiSchemaEnvironmentManifest(): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Schema/environment-manifest',
      errors: {
        304: `Manifest not modified (ETag match)`,
        404: `Manifest file not found`,
      },
    });
  }
}

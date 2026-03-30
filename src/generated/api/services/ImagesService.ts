/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_ImageInfoDto } from '../models/PCode_Application_DTOs_ImageInfoDto';
import type { PCode_Application_DTOs_ImageUploadResponseDto } from '../models/PCode_Application_DTOs_ImageUploadResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ImagesService {
  /**
   * @returns PCode_Application_DTOs_ImageUploadResponseDto OK
   * @throws ApiError
   */
  public static postApiImagesUpload({
    formData,
  }: {
    formData?: {
      /**
       * Upload stream validation must be skipped because ABP recursively reflects stream timeout properties.
       */
      File?: Blob;
      /**
       * Session identifier or draft owner key that owns the uploaded image.
       */
      SessionId?: string;
    },
  }): CancelablePromise<PCode_Application_DTOs_ImageUploadResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Images/upload',
      formData: formData,
      mediaType: 'multipart/form-data',
    });
  }
  /**
   * @returns boolean OK
   * @throws ApiError
   */
  public static deleteApiImages({
    sessionId,
    imageId,
  }: {
    sessionId: string,
    imageId: string,
  }): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Images/{sessionId}/{imageId}',
      path: {
        'sessionId': sessionId,
        'imageId': imageId,
      },
    });
  }
  /**
   * @returns PCode_Application_DTOs_ImageInfoDto OK
   * @throws ApiError
   */
  public static getApiImages({
    sessionId,
    imageId,
  }: {
    sessionId: string,
    imageId: string,
  }): CancelablePromise<PCode_Application_DTOs_ImageInfoDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Images/{sessionId}/{imageId}',
      path: {
        'sessionId': sessionId,
        'imageId': imageId,
      },
    });
  }
  /**
   * @returns PCode_Application_DTOs_ImageInfoDto OK
   * @throws ApiError
   */
  public static getApiImagesSession({
    sessionId,
  }: {
    sessionId: string,
  }): CancelablePromise<Array<PCode_Application_DTOs_ImageInfoDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Images/session/{sessionId}',
      path: {
        'sessionId': sessionId,
      },
    });
  }
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static getApiImagesContent({
    sessionId,
    imageId,
  }: {
    sessionId: string,
    imageId: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Images/{sessionId}/{imageId}/content',
      path: {
        'sessionId': sessionId,
        'imageId': imageId,
      },
    });
  }
}

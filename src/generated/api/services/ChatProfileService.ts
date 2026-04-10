/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ChatProfileDto } from '../models/PCode_Application_Contracts_Dto_ChatProfileDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ChatProfileService {
  /**
   * @returns PCode_Application_Contracts_Dto_ChatProfileDto OK
   * @throws ApiError
   */
  public static getApiProfileChat(): CancelablePromise<PCode_Application_Contracts_Dto_ChatProfileDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/profile/chat',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_ChatProfileDto OK
   * @throws ApiError
   */
  public static putApiProfileChat({
    formData,
  }: {
    formData?: {
      /**
       * Updated nickname for the current user's chat identity.
       */
      Nickname?: string;
      /**
       * Whether the persisted avatar should be removed.
       */
      RemoveAvatar?: boolean;
      /**
       * Optional replacement avatar image.
       */
      AvatarFile?: Blob;
    },
  }): CancelablePromise<PCode_Application_Contracts_Dto_ChatProfileDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/profile/chat',
      formData: formData,
      mediaType: 'multipart/form-data',
      errors: {
        400: `Bad Request`,
        500: `Internal Server Error`,
      },
    });
  }
}

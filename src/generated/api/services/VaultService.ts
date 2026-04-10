/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_CreateVaultRequestDto } from '../models/PCode_Application_Contracts_Dto_CreateVaultRequestDto';
import type { PCode_Application_Contracts_Dto_DeleteVaultResponseDto } from '../models/PCode_Application_Contracts_Dto_DeleteVaultResponseDto';
import type { PCode_Application_Contracts_Dto_UpdateVaultRequestDto } from '../models/PCode_Application_Contracts_Dto_UpdateVaultRequestDto';
import type { PCode_Application_Contracts_Dto_VaultFileListResponseDto } from '../models/PCode_Application_Contracts_Dto_VaultFileListResponseDto';
import type { PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto } from '../models/PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto';
import type { PCode_Application_Contracts_Dto_VaultItemDto } from '../models/PCode_Application_Contracts_Dto_VaultItemDto';
import type { PCode_Application_Contracts_Dto_VaultListResponseDto } from '../models/PCode_Application_Contracts_Dto_VaultListResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VaultService {
  /**
   * @returns PCode_Application_Contracts_Dto_VaultListResponseDto OK
   * @throws ApiError
   */
  public static getApiVaults(): CancelablePromise<PCode_Application_Contracts_Dto_VaultListResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/vaults',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_VaultItemDto OK
   * @throws ApiError
   */
  public static postApiVaults({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_CreateVaultRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_VaultItemDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/vaults',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_VaultItemDto OK
   * @throws ApiError
   */
  public static putApiVaults({
    id,
    requestBody,
  }: {
    id: string,
    requestBody?: PCode_Application_Contracts_Dto_UpdateVaultRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_VaultItemDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/vaults/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DeleteVaultResponseDto OK
   * @throws ApiError
   */
  public static deleteApiVaults({
    id,
    deleteLocalFiles = false,
  }: {
    id: string,
    deleteLocalFiles?: boolean,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DeleteVaultResponseDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/vaults/{id}',
      path: {
        'id': id,
      },
      query: {
        'deleteLocalFiles': deleteLocalFiles,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_VaultFileListResponseDto OK
   * @throws ApiError
   */
  public static getApiVaultsFiles({
    id,
    path,
  }: {
    id: string,
    path?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_VaultFileListResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/vaults/{id}/files',
      path: {
        'id': id,
      },
      query: {
        'path': path,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto OK
   * @throws ApiError
   */
  public static getApiVaultsFilesContent({
    id,
    path,
  }: {
    id: string,
    path?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/vaults/{id}/files/content',
      path: {
        'id': id,
      },
      query: {
        'path': path,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
}

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_DataManagement_CleanArchivedResultDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_CleanArchivedResultDto';
import type { PCode_Application_Contracts_Dto_DataManagement_DatabaseInfoDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_DatabaseInfoDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ImageStorageBulkDeleteResultDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_ImageStorageBulkDeleteResultDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ImageStorageDeleteResultDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_ImageStorageDeleteResultDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileDetailDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileDetailDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileQueryRequestDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileQueryRequestDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileSummaryDto_PCode_Application_Contracts_Version_1_0_0_0_Culture_neutral_PublicKeyToken_null_ } from '../models/PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileSummaryDto_PCode_Application_Contracts_Version_1_0_0_0_Culture_neutral_PublicKeyToken_null_';
import type { PCode_Application_Contracts_Dto_DataManagement_ImageStorageOverviewDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_ImageStorageOverviewDto';
import type { PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDeleteResultDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDeleteResultDto';
import type { PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDetailDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDetailDto';
import type { PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileSummaryDto_PCode_Application_Contracts_Version_1_0_0_0_Culture_neutral_PublicKeyToken_null_ } from '../models/PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileSummaryDto_PCode_Application_Contracts_Version_1_0_0_0_Culture_neutral_PublicKeyToken_null_';
import type { PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileValidationResultDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileValidationResultDto';
import type { PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseOverviewDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseOverviewDto';
import type { Volo_Abp_Application_Dtos_PagedResultDto_1 } from '../models/Volo_Abp_Application_Dtos_PagedResultDto_1';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AppService {
  /**
   * Gets database information including type, size, and archived session count
   * @returns PCode_Application_Contracts_Dto_DataManagement_DatabaseInfoDto Database information retrieved successfully
   * @throws ApiError
   */
  public static getApiAppDatabaseInfo(): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_DatabaseInfoDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/database/info',
      errors: {
        500: `Error occurred while retrieving database information`,
      },
    });
  }
  /**
   * Cleans archived sessions and their related data from the database
   * @returns PCode_Application_Contracts_Dto_DataManagement_CleanArchivedResultDto Cleanup completed successfully
   * @throws ApiError
   */
  public static postApiAppDatabaseCleanArchived(): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_CleanArchivedResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/App/database/clean-archived',
      errors: {
        500: `Error occurred during cleanup`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_ImageStorageOverviewDto OK
   * @throws ApiError
   */
  public static getApiAppImageStorageOverview(): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ImageStorageOverviewDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/image-storage/overview',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns Volo_Abp_Application_Dtos_PagedResultDto_1<PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileSummaryDto_PCode_Application_Contracts_Version_1_0_0_0_Culture_neutral_PublicKeyToken_null_> OK
   * @throws ApiError
   */
  public static getApiAppImageStorageFiles({
    ownerKey,
    fileName,
    managementStatus,
    skipCount,
    maxResultCount,
  }: {
    ownerKey?: string,
    fileName?: string,
    managementStatus?: string,
    skipCount?: number,
    maxResultCount?: number,
  }): CancelablePromise<Volo_Abp_Application_Dtos_PagedResultDto_1> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/image-storage/files',
      query: {
        'OwnerKey': ownerKey,
        'FileName': fileName,
        'ManagementStatus': managementStatus,
        'SkipCount': skipCount,
        'MaxResultCount': maxResultCount,
      },
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileDetailDto OK
   * @throws ApiError
   */
  public static getApiAppImageStorageFiles1({
    ownerId,
    imageId,
  }: {
    ownerId: string,
    imageId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileDetailDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/image-storage/files/{ownerId}/{imageId}',
      path: {
        'ownerId': ownerId,
        'imageId': imageId,
      },
      errors: {
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_ImageStorageDeleteResultDto OK
   * @throws ApiError
   */
  public static deleteApiAppImageStorageFiles({
    ownerId,
    imageId,
  }: {
    ownerId: string,
    imageId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ImageStorageDeleteResultDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/App/image-storage/files/{ownerId}/{imageId}',
      path: {
        'ownerId': ownerId,
        'imageId': imageId,
      },
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_ImageStorageBulkDeleteResultDto OK
   * @throws ApiError
   */
  public static postApiAppImageStorageFilesDeleteAll({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_DataManagement_ImageStorageFileQueryRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ImageStorageBulkDeleteResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/App/image-storage/files/delete-all',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseOverviewDto OK
   * @throws ApiError
   */
  public static getApiAppMessageDatabaseOverview(): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseOverviewDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/message-database/overview',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns Volo_Abp_Application_Dtos_PagedResultDto_1<PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileSummaryDto_PCode_Application_Contracts_Version_1_0_0_0_Culture_neutral_PublicKeyToken_null_> OK
   * @throws ApiError
   */
  public static getApiAppMessageDatabaseFiles({
    shardKey,
    fileName,
    validationStatus,
    skipCount,
    maxResultCount,
  }: {
    shardKey?: string,
    fileName?: string,
    validationStatus?: string,
    skipCount?: number,
    maxResultCount?: number,
  }): CancelablePromise<Volo_Abp_Application_Dtos_PagedResultDto_1> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/message-database/files',
      query: {
        'ShardKey': shardKey,
        'FileName': fileName,
        'ValidationStatus': validationStatus,
        'SkipCount': skipCount,
        'MaxResultCount': maxResultCount,
      },
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDetailDto OK
   * @throws ApiError
   */
  public static getApiAppMessageDatabaseFiles1({
    shardKey,
  }: {
    shardKey: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDetailDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/App/message-database/files/{shardKey}',
      path: {
        'shardKey': shardKey,
      },
      errors: {
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDeleteResultDto OK
   * @throws ApiError
   */
  public static deleteApiAppMessageDatabaseFiles({
    shardKey,
  }: {
    shardKey: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileDeleteResultDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/App/message-database/files/{shardKey}',
      path: {
        'shardKey': shardKey,
      },
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileValidationResultDto OK
   * @throws ApiError
   */
  public static postApiAppMessageDatabaseFilesValidate({
    shardKey,
  }: {
    shardKey: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_MessageDatabaseFileValidationResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/App/message-database/files/{shardKey}/validate',
      path: {
        'shardKey': shardKey,
      },
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
}

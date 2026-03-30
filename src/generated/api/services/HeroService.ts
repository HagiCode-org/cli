/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_BatchCreateHeroDto } from '../models/PCode_Application_Contracts_Dto_BatchCreateHeroDto';
import type { PCode_Application_Contracts_Dto_CreateHeroDto } from '../models/PCode_Application_Contracts_Dto_CreateHeroDto';
import type { PCode_Application_Contracts_Dto_CreateHeroSecondaryProfessionDto } from '../models/PCode_Application_Contracts_Dto_CreateHeroSecondaryProfessionDto';
import type { PCode_Application_Contracts_Dto_HeroAvatarCatalogDto } from '../models/PCode_Application_Contracts_Dto_HeroAvatarCatalogDto';
import type { PCode_Application_Contracts_Dto_HeroDto } from '../models/PCode_Application_Contracts_Dto_HeroDto';
import type { PCode_Application_Contracts_Dto_HeroDungeonRosterDto } from '../models/PCode_Application_Contracts_Dto_HeroDungeonRosterDto';
import type { PCode_Application_Contracts_Dto_HeroDungeonSelectableHeroDto } from '../models/PCode_Application_Contracts_Dto_HeroDungeonSelectableHeroDto';
import type { PCode_Application_Contracts_Dto_HeroHistoryQueryResultDto } from '../models/PCode_Application_Contracts_Dto_HeroHistoryQueryResultDto';
import type { PCode_Application_Contracts_Dto_HeroRealtimeDashboardDto } from '../models/PCode_Application_Contracts_Dto_HeroRealtimeDashboardDto';
import type { PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto } from '../models/PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto';
import type { PCode_Application_Contracts_Dto_HeroStatusBarHistorySnapshotDto } from '../models/PCode_Application_Contracts_Dto_HeroStatusBarHistorySnapshotDto';
import type { PCode_Application_Contracts_Dto_HeroSystemSettingsDto } from '../models/PCode_Application_Contracts_Dto_HeroSystemSettingsDto';
import type { PCode_Application_Contracts_Dto_InstallHeroPrimaryProfessionResultDto } from '../models/PCode_Application_Contracts_Dto_InstallHeroPrimaryProfessionResultDto';
import type { PCode_Application_Contracts_Dto_SaveHeroDungeonRosterDto } from '../models/PCode_Application_Contracts_Dto_SaveHeroDungeonRosterDto';
import type { PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionDto } from '../models/PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionDto';
import type { PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionResultDto } from '../models/PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionResultDto';
import type { PCode_Application_Contracts_Dto_UpdateDefaultHeroDto } from '../models/PCode_Application_Contracts_Dto_UpdateDefaultHeroDto';
import type { PCode_Application_Contracts_Dto_UpdateHeroDto } from '../models/PCode_Application_Contracts_Dto_UpdateHeroDto';
import type { PCode_Application_Contracts_Dto_UpdateHeroPrimaryProfessionEnablementDto } from '../models/PCode_Application_Contracts_Dto_UpdateHeroPrimaryProfessionEnablementDto';
import type { PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionDto } from '../models/PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionDto';
import type { PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionResultDto } from '../models/PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionResultDto';
import type { PCode_Application_Contracts_Dto_UpdateHeroSpecialEmergencyTeamDto } from '../models/PCode_Application_Contracts_Dto_UpdateHeroSpecialEmergencyTeamDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HeroService {
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDto OK
   * @throws ApiError
   */
  public static getApiHero(): CancelablePromise<Array<PCode_Application_Contracts_Dto_HeroDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDto OK
   * @throws ApiError
   */
  public static postApiHero({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_CreateHeroDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Hero',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroAvatarCatalogDto OK
   * @throws ApiError
   */
  public static getApiHeroAvatarCatalog(): CancelablePromise<PCode_Application_Contracts_Dto_HeroAvatarCatalogDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/avatar-catalog',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDto OK
   * @throws ApiError
   */
  public static getApiHero1({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/{id}',
      path: {
        'id': id,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDto OK
   * @throws ApiError
   */
  public static putApiHero({
    id,
    requestBody,
  }: {
    id: string,
    requestBody?: PCode_Application_Contracts_Dto_UpdateHeroDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Hero/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static deleteApiHero({
    id,
  }: {
    id: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Hero/{id}',
      path: {
        'id': id,
      },
    });
  }
  /**
   * Creates a shared-configuration hero batch with server-generated names and avatars.
   * @returns PCode_Application_Contracts_Dto_HeroDto OK
   * @throws ApiError
   */
  public static postApiHeroBatchCreate({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_BatchCreateHeroDto,
  }): CancelablePromise<Array<PCode_Application_Contracts_Dto_HeroDto>> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Hero/batch-create',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDto OK
   * @throws ApiError
   */
  public static postApiHeroClone({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Hero/{id}/clone',
      path: {
        'id': id,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroRealtimeDashboardDto OK
   * @throws ApiError
   */
  public static getApiHeroRealtimeDashboard({
    limit = 5,
  }: {
    limit?: number,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroRealtimeDashboardDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/realtime-dashboard',
      query: {
        'limit': limit,
      },
    });
  }
  /**
   * Returns the recent hero history preview shown in the status bar.
   * @returns PCode_Application_Contracts_Dto_HeroStatusBarHistorySnapshotDto OK
   * @throws ApiError
   */
  public static getApiHeroStatusBarHistory(): CancelablePromise<PCode_Application_Contracts_Dto_HeroStatusBarHistorySnapshotDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/status-bar-history',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDungeonRosterDto OK
   * @throws ApiError
   */
  public static getApiHeroDungeons(): CancelablePromise<Array<PCode_Application_Contracts_Dto_HeroDungeonRosterDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/dungeons',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDungeonSelectableHeroDto OK
   * @throws ApiError
   */
  public static getApiHeroDungeonsSelectableHeroes(): CancelablePromise<Array<PCode_Application_Contracts_Dto_HeroDungeonSelectableHeroDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/dungeons/selectable-heroes',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroDungeonRosterDto OK
   * @throws ApiError
   */
  public static putApiHeroDungeons({
    scriptKey,
    requestBody,
  }: {
    scriptKey: string,
    requestBody?: PCode_Application_Contracts_Dto_SaveHeroDungeonRosterDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroDungeonRosterDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Hero/dungeons/{scriptKey}',
      path: {
        'scriptKey': scriptKey,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroSystemSettingsDto OK
   * @throws ApiError
   */
  public static postApiHeroHeroSettingsSecondaryProfessions({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_CreateHeroSecondaryProfessionDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroSystemSettingsDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Hero/hero-settings/secondary-professions',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionResultDto OK
   * @throws ApiError
   */
  public static putApiHeroHeroSettingsSecondaryProfessions({
    secondaryProfessionId,
    requestBody,
  }: {
    secondaryProfessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_UpdateHeroSecondaryProfessionResultDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Hero/hero-settings/secondary-professions/{secondaryProfessionId}',
      path: {
        'secondaryProfessionId': secondaryProfessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroSystemSettingsDto OK
   * @throws ApiError
   */
  public static deleteApiHeroHeroSettingsSecondaryProfessions({
    secondaryProfessionId,
    primaryProfessionId,
  }: {
    secondaryProfessionId: string,
    primaryProfessionId?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroSystemSettingsDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Hero/hero-settings/secondary-professions/{secondaryProfessionId}',
      path: {
        'secondaryProfessionId': secondaryProfessionId,
      },
      query: {
        'primaryProfessionId': primaryProfessionId,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionResultDto OK
   * @throws ApiError
   */
  public static postApiHeroHeroSettingsSecondaryProfessionsSync({
    secondaryProfessionId,
    requestBody,
  }: {
    secondaryProfessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SyncHeroSecondaryProfessionResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Hero/hero-settings/secondary-professions/{secondaryProfessionId}/sync',
      path: {
        'secondaryProfessionId': secondaryProfessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto OK
   * @throws ApiError
   */
  public static getApiHeroHeroSettingsSpecialEmergencyTeam(): CancelablePromise<PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/hero-settings/special-emergency-team',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto OK
   * @throws ApiError
   */
  public static putApiHeroHeroSettingsSpecialEmergencyTeam({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UpdateHeroSpecialEmergencyTeamDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Hero/hero-settings/special-emergency-team',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns string OK
   * @throws ApiError
   */
  public static getApiHeroHeroSettingsDefaultHero(): CancelablePromise<string> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/hero-settings/default-hero',
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static putApiHeroHeroSettingsDefaultHero({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UpdateDefaultHeroDto,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Hero/hero-settings/default-hero',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_HeroHistoryQueryResultDto OK
   * @throws ApiError
   */
  public static getApiHeroHistory({
    id,
    eventTypes,
    fromUtc,
    toUtc,
    cursor,
    pageSize,
    sourceCategory,
  }: {
    id: string,
    eventTypes?: Array<string>,
    fromUtc?: string,
    toUtc?: string,
    cursor?: string,
    pageSize?: number,
    sourceCategory?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_HeroHistoryQueryResultDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Hero/{id}/history',
      path: {
        'id': id,
      },
      query: {
        'EventTypes': eventTypes,
        'FromUtc': fromUtc,
        'ToUtc': toUtc,
        'Cursor': cursor,
        'PageSize': pageSize,
        'SourceCategory': sourceCategory,
      },
    });
  }
  /**
   * Updates the enablement state for a primary profession.
   * @returns void
   * @throws ApiError
   */
  public static putApiHeroHeroSettingsPrimaryProfessions({
    id,
    requestBody,
  }: {
    /**
     * Primary profession ID from the system catalog.
     */
    id: string,
    /**
     * Enablement payload.
     */
    requestBody?: PCode_Application_Contracts_Dto_UpdateHeroPrimaryProfessionEnablementDto,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Hero/hero-settings/primary-professions/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Triggers the controlled CLI installation flow for a primary profession.
   * @returns PCode_Application_Contracts_Dto_InstallHeroPrimaryProfessionResultDto OK
   * @throws ApiError
   */
  public static postApiHeroHeroSettingsPrimaryProfessionsInstall({
    id,
  }: {
    /**
     * Primary profession ID from the system catalog.
     */
    id: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_InstallHeroPrimaryProfessionResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Hero/hero-settings/primary-professions/{id}/install',
      path: {
        'id': id,
      },
    });
  }
}

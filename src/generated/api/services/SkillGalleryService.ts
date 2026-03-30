/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto } from '../models/PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto';
import type { PCode_Application_Contracts_Dto_GenerateSkillRecommendationsRequestDto } from '../models/PCode_Application_Contracts_Dto_GenerateSkillRecommendationsRequestDto';
import type { PCode_Application_Contracts_Dto_InstallRecommendedSkillsRequestDto } from '../models/PCode_Application_Contracts_Dto_InstallRecommendedSkillsRequestDto';
import type { PCode_Application_Contracts_Dto_InstallRecommendedSkillsResponseDto } from '../models/PCode_Application_Contracts_Dto_InstallRecommendedSkillsResponseDto';
import type { PCode_Application_Contracts_Dto_InstallSkillRequestDto } from '../models/PCode_Application_Contracts_Dto_InstallSkillRequestDto';
import type { PCode_Application_Contracts_Dto_InstallSkillResultDto } from '../models/PCode_Application_Contracts_Dto_InstallSkillResultDto';
import type { PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto } from '../models/PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto';
import type { PCode_Application_Contracts_Dto_SkillGalleryDetailDto } from '../models/PCode_Application_Contracts_Dto_SkillGalleryDetailDto';
import type { PCode_Application_Contracts_Dto_SkillGalleryResponseDto } from '../models/PCode_Application_Contracts_Dto_SkillGalleryResponseDto';
import type { PCode_Application_Contracts_Dto_SkillRecommendationConfigDto } from '../models/PCode_Application_Contracts_Dto_SkillRecommendationConfigDto';
import type { PCode_Application_Contracts_Dto_SkillRecommendationResponseDto } from '../models/PCode_Application_Contracts_Dto_SkillRecommendationResponseDto';
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto } from '../models/PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto';
import type { PCode_Application_Contracts_Dto_UninstallLocalSkillRequestDto } from '../models/PCode_Application_Contracts_Dto_UninstallLocalSkillRequestDto';
import type { PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto } from '../models/PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto';
import type { PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto } from '../models/PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SkillGalleryService {
  /**
   * Returns the current global skill inventory used by the local-management tab.
   * @returns PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto OK
   * @throws ApiError
   */
  public static getApiSkillsLocal(): CancelablePromise<PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/skills/local',
    });
  }
  /**
   * Removes one globally installed skill through the managed backend flow.
   * @returns PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto OK
   * @throws ApiError
   */
  public static postApiSkillsLocalUninstall({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UninstallLocalSkillRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/skills/local/uninstall',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Returns a normalized catalog sourced from `HagiCode.Libs.Skills`.
   * @returns PCode_Application_Contracts_Dto_SkillGalleryResponseDto OK
   * @throws ApiError
   */
  public static getApiSkillsGallery({
    query,
  }: {
    query?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SkillGalleryResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/skills/gallery',
      query: {
        'query': query,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_SkillGalleryDetailDto OK
   * @throws ApiError
   */
  public static getApiSkillsGalleryDetail({
    id,
    source,
  }: {
    id?: string,
    source?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SkillGalleryDetailDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/skills/gallery/detail',
      query: {
        'id': id,
        'source': source,
      },
    });
  }
  /**
   * Returns the verified trusted-provider directory used to label trusted skill sources.
   * This catalog describes verified providers, not credential or secret storage.
   * @returns PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto OK
   * @throws ApiError
   */
  public static getApiSkillsProvidersTrusted(): CancelablePromise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/skills/providers/trusted',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto OK
   * @throws ApiError
   */
  public static postApiSkillsProvidersTrusted({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/skills/providers/trusted',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto OK
   * @throws ApiError
   */
  public static deleteApiSkillsProvidersTrusted({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/skills/providers/trusted',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto OK
   * @throws ApiError
   */
  public static postApiSkillsProvidersTrustedReset(): CancelablePromise<PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/skills/providers/trusted/reset',
    });
  }
  /**
   * Starts the managed skill install flow. The backend always builds
   * `npx skills add <ref> -g -y` so web-triggered installs stay non-interactive.
   * @returns PCode_Application_Contracts_Dto_InstallSkillResultDto OK
   * @throws ApiError
   */
  public static postApiSkillsGalleryInstall({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_InstallSkillRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_InstallSkillResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/skills/gallery/install',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Returns the recommendation tab bootstrap config, including effective hero and prompt summaries.
   * @returns PCode_Application_Contracts_Dto_SkillRecommendationConfigDto OK
   * @throws ApiError
   */
  public static getApiSkillsRecommendationsConfig({
    locale,
  }: {
    locale?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SkillRecommendationConfigDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/skills/recommendations/config',
      query: {
        'locale': locale,
      },
    });
  }
  /**
   * Generates AI-assisted skill recommendations from the current project portfolio.
   * @returns PCode_Application_Contracts_Dto_SkillRecommendationResponseDto OK
   * @throws ApiError
   */
  public static postApiSkillsRecommendationsGenerate({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_GenerateSkillRecommendationsRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SkillRecommendationResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/skills/recommendations/generate',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Installs multiple selected recommendations through the existing managed single-skill install flow.
   * @returns PCode_Application_Contracts_Dto_InstallRecommendedSkillsResponseDto OK
   * @throws ApiError
   */
  public static postApiSkillsRecommendationsInstall({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_InstallRecommendedSkillsRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_InstallRecommendedSkillsResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/skills/recommendations/install',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Streams managed install progress as an SSE response so the frontend can render live command output.
   * @returns any OK
   * @throws ApiError
   */
  public static getApiSkillsGalleryInstallStream({
    id,
    source,
    skillSlug,
    version,
  }: {
    id?: string,
    source?: string,
    skillSlug?: string,
    version?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/skills/gallery/install/stream',
      query: {
        'id': id,
        'source': source,
        'skillSlug': skillSlug,
        'version': version,
      },
    });
  }
}

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_DocsPresetIndexResponseDto } from '../models/PCode_Web_Controllers_DocsPresetIndexResponseDto';
import type { PCode_Web_Controllers_DocsProviderPresetResponseDto } from '../models/PCode_Web_Controllers_DocsProviderPresetResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocsPresetsService {
  /**
   * Proxies the docs preset index through the backend origin.
   * Fetches presets/index.json from docs.hagicode.com through a same-origin backend proxy.
   * @returns PCode_Web_Controllers_DocsPresetIndexResponseDto OK
   * @throws ApiError
   */
  public static getDocsPresetIndex(): CancelablePromise<PCode_Web_Controllers_DocsPresetIndexResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/docs/presets/index.json',
      errors: {
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Proxies a provider preset JSON file through the backend origin.
   * Fetches a provider JSON file from docs.hagicode.com/presets/{presetType}/providers through the backend proxy.
   * @returns PCode_Web_Controllers_DocsProviderPresetResponseDto OK
   * @throws ApiError
   */
  public static getDocsPresetProvider({
    presetType,
    providerFileName,
  }: {
    /**
     * Preset family, for example `claude-code`.
     */
    presetType: string,
    /**
     * Provider JSON file name, for example `zai.json`.
     */
    providerFileName: string,
  }): CancelablePromise<PCode_Web_Controllers_DocsProviderPresetResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/docs/presets/{presetType}/providers/{providerFileName}',
      path: {
        'presetType': presetType,
        'providerFileName': providerFileName,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
}

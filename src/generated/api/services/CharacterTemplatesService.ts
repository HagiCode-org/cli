/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_CharacterTemplateDetailResponseDto } from '../models/PCode_Web_Controllers_CharacterTemplateDetailResponseDto';
import type { PCode_Web_Controllers_CharacterTemplateManifestResponseDto } from '../models/PCode_Web_Controllers_CharacterTemplateManifestResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CharacterTemplatesService {
  /**
   * Proxies the root character template manifest through the backend origin.
   * Fetches character-templates/index.json from index.hagicode.com through a same-origin backend proxy.
   * @returns PCode_Web_Controllers_CharacterTemplateManifestResponseDto OK
   * @throws ApiError
   */
  public static getCharacterTemplateManifest(): CancelablePromise<PCode_Web_Controllers_CharacterTemplateManifestResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/character-templates/index.json',
      errors: {
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Proxies a published character template detail JSON document through the backend origin.
   * Fetches a published character template detail JSON file from index.hagicode.com/character-templates/templates/{templateFileName}.
   * @returns PCode_Web_Controllers_CharacterTemplateDetailResponseDto OK
   * @throws ApiError
   */
  public static getCharacterTemplateDetail({
    templateFileName,
  }: {
    templateFileName: string,
  }): CancelablePromise<PCode_Web_Controllers_CharacterTemplateDetailResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/character-templates/templates/{templateFileName}',
      path: {
        'templateFileName': templateFileName,
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

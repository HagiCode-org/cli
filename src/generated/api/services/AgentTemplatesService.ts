/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_AgentTemplateDetailResponseDto } from '../models/PCode_Web_Controllers_AgentTemplateDetailResponseDto';
import type { PCode_Web_Controllers_AgentTemplateManifestResponseDto } from '../models/PCode_Web_Controllers_AgentTemplateManifestResponseDto';
import type { PCode_Web_Controllers_AgentTemplateTypeIndexResponseDto } from '../models/PCode_Web_Controllers_AgentTemplateTypeIndexResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AgentTemplatesService {
  /**
   * Proxies the root agent template manifest through the backend origin.
   * Fetches agent-templates/index.json from index.hagicode.com through a same-origin backend proxy.
   * @returns PCode_Web_Controllers_AgentTemplateManifestResponseDto OK
   * @throws ApiError
   */
  public static getAgentTemplateManifest(): CancelablePromise<PCode_Web_Controllers_AgentTemplateManifestResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/agent-templates/index.json',
      errors: {
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Proxies a published template type index through the backend origin.
   * Fetches a published trait or soul template index from index.hagicode.com/agent-templates/{templateType}/index.json.
   * @returns PCode_Web_Controllers_AgentTemplateTypeIndexResponseDto OK
   * @throws ApiError
   */
  public static getAgentTemplateTypeIndex({
    templateType,
  }: {
    templateType: string,
  }): CancelablePromise<PCode_Web_Controllers_AgentTemplateTypeIndexResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/agent-templates/{templateType}/index.json',
      path: {
        'templateType': templateType,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Proxies a published template detail JSON document through the backend origin.
   * Fetches a published trait or soul template detail JSON file from index.hagicode.com/agent-templates/{templateType}/templates/{templateFileName}.
   * @returns PCode_Web_Controllers_AgentTemplateDetailResponseDto OK
   * @throws ApiError
   */
  public static getAgentTemplateDetail({
    templateType,
    templateFileName,
  }: {
    templateType: string,
    templateFileName: string,
  }): CancelablePromise<PCode_Web_Controllers_AgentTemplateDetailResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/agent-templates/{templateType}/templates/{templateFileName}',
      path: {
        'templateType': templateType,
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

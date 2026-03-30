/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_DoubaoVoice_WebProxy_Models_ClientConfigDto } from '../models/PCode_Web_DoubaoVoice_WebProxy_Models_ClientConfigDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DoubaoVoiceService {
  /**
   * WebSocket endpoint for real-time voice recognition
   * @returns any OK
   * @throws ApiError
   */
  public static getApiDoubaoVoiceWs(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/DoubaoVoice/ws',
    });
  }
  /**
   * Test connection endpoint
   * @returns any OK
   * @throws ApiError
   */
  public static postApiDoubaoVoiceTest({
    requestBody,
  }: {
    requestBody?: PCode_Web_DoubaoVoice_WebProxy_Models_ClientConfigDto,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/DoubaoVoice/test',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}

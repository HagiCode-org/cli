/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VoiceReminderCatalogDto } from '../models/PCode_Application_Contracts_Dto_VoiceReminderCatalogDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NotificationService {
  /**
   * @returns PCode_Application_Contracts_Dto_VoiceReminderCatalogDto OK
   * @throws ApiError
   */
  public static getApiNotificationVoiceReminderPlugins(): CancelablePromise<PCode_Application_Contracts_Dto_VoiceReminderCatalogDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Notification/voice-reminder-plugins',
    });
  }
}

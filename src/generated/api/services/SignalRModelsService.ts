/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AutoComposeCommitCompletedDto } from '../models/PCode_Models_AutoComposeCommitCompletedDto';
import type { PCode_Models_ErrorResponse } from '../models/PCode_Models_ErrorResponse';
import type { PCode_Models_HeroStatusBarHistoryUpdatedDto } from '../models/PCode_Models_HeroStatusBarHistoryUpdatedDto';
import type { PCode_Models_MessageCompletedDto } from '../models/PCode_Models_MessageCompletedDto';
import type { PCode_Models_MessageStreamingDto } from '../models/PCode_Models_MessageStreamingDto';
import type { PCode_Models_SessionCancelledDto } from '../models/PCode_Models_SessionCancelledDto';
import type { PCode_Models_SessionQueueUpdatedDto } from '../models/PCode_Models_SessionQueueUpdatedDto';
import type { PCode_Models_SubscribeToSessionRequest } from '../models/PCode_Models_SubscribeToSessionRequest';
import type { PCode_Models_SubscriptionConfirmedResponse } from '../models/PCode_Models_SubscriptionConfirmedResponse';
import type { PCode_Models_TokenThroughputUpdatedDto } from '../models/PCode_Models_TokenThroughputUpdatedDto';
import type { PCode_Models_UnsubscribeFromSessionRequest } from '../models/PCode_Models_UnsubscribeFromSessionRequest';
import type { PCode_Models_UnsubscriptionConfirmedResponse } from '../models/PCode_Models_UnsubscriptionConfirmedResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SignalRModelsService {
  /**
   * Returns the base SignalR DTO type with all polymorphic derived types.
   * This endpoint exists only for OpenAPI schema generation.
   * @returns any OK
   * @throws ApiError
   */
  public static getApiModelsMessageTypes(): CancelablePromise<(PCode_Models_MessageStreamingDto | PCode_Models_MessageCompletedDto | PCode_Models_SubscriptionConfirmedResponse | PCode_Models_UnsubscriptionConfirmedResponse | PCode_Models_ErrorResponse | PCode_Models_SessionQueueUpdatedDto | PCode_Models_SessionCancelledDto | PCode_Models_TokenThroughputUpdatedDto | PCode_Models_HeroStatusBarHistoryUpdatedDto | PCode_Models_AutoComposeCommitCompletedDto)> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/models/message-types',
    });
  }
  /**
   * Returns the base SignalR request type with all polymorphic derived types.
   * This endpoint exists only for OpenAPI schema generation.
   * @returns any OK
   * @throws ApiError
   */
  public static getApiModelsRequestTypes(): CancelablePromise<(PCode_Models_SubscribeToSessionRequest | PCode_Models_UnsubscribeFromSessionRequest)> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/models/request-types',
    });
  }
}

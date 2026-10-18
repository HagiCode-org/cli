/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SessionResponseDto } from '../models/PCode_Models_SessionResponseDto';
import type { PCode_Web_Controllers_ScheduledPlanRunAcceptedDto } from '../models/PCode_Web_Controllers_ScheduledPlanRunAcceptedDto';
import type { PCode_Web_Controllers_ScheduledPlanResponse } from '../models/PCode_Web_Controllers_ScheduledPlanResponse';
import type { PCode_Web_Controllers_ScheduledPlanSaveRequest } from '../models/PCode_Web_Controllers_ScheduledPlanSaveRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ScheduledPlansService {
  /**
   * @returns PCode_Web_Controllers_ScheduledPlanResponse OK
   * @throws ApiError
   */
  public static getApiScheduledPlans(): CancelablePromise<Array<PCode_Web_Controllers_ScheduledPlanResponse>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/ScheduledPlans',
    });
  }
  /**
   * @returns PCode_Web_Controllers_ScheduledPlanResponse OK
   * @throws ApiError
   */
  public static postApiScheduledPlans({
    requestBody,
  }: {
    requestBody?: PCode_Web_Controllers_ScheduledPlanSaveRequest,
  }): CancelablePromise<PCode_Web_Controllers_ScheduledPlanResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/ScheduledPlans',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
      },
    });
  }
  /**
   * @returns PCode_Web_Controllers_ScheduledPlanResponse OK
   * @throws ApiError
   */
  public static getApiScheduledPlans1({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Web_Controllers_ScheduledPlanResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/ScheduledPlans/{id}',
      path: {
        'id': id,
      },
      errors: {
        404: `Not Found`,
      },
    });
  }
  /**
   * @returns PCode_Web_Controllers_ScheduledPlanResponse OK
   * @throws ApiError
   */
  public static putApiScheduledPlans({
    id,
    requestBody,
  }: {
    id: string,
    requestBody?: PCode_Web_Controllers_ScheduledPlanSaveRequest,
  }): CancelablePromise<PCode_Web_Controllers_ScheduledPlanResponse> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/ScheduledPlans/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
      },
    });
  }
  /**
   * @returns void
   * @throws ApiError
   */
  public static deleteApiScheduledPlans({
    id,
  }: {
    id: string,
  }): CancelablePromise<void> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/ScheduledPlans/{id}',
      path: {
        'id': id,
      },
      errors: {
        404: `Not Found`,
      },
    });
  }
  /**
   * Creates a session from the stored inputs now. The schedule, state and next run time are not read for update and
   * are not changed, and the scheduler is not notified.
   * @returns PCode_Models_SessionResponseDto OK
   * @throws ApiError
   */
  public static postApiScheduledPlansRun({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/ScheduledPlans/{id}/run',
      path: {
        'id': id,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
      },
    });
  }
  /**
   * Starts the same manual run as <see cref="Run"/> in the background and answers 202 as soon as it is handed to the
   * scheduler grain, without waiting for the session to be created. A failed creation is logged by the grain; the new
   * session shows up through the usual session list updates. The schedule and next run time are not changed.
   * @returns PCode_Web_Controllers_ScheduledPlanRunAcceptedDto Accepted
   * @throws ApiError
   */
  public static postApiScheduledPlansStart({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Web_Controllers_ScheduledPlanRunAcceptedDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/ScheduledPlans/{id}/start',
      path: {
        'id': id,
      },
      errors: {
        404: `Not Found`,
        503: `Service Unavailable`,
      },
    });
  }
}

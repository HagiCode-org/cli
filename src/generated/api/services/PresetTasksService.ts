/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_PresetTaskCreationSchemaDto } from '../models/PCode_Web_Controllers_PresetTaskCreationSchemaDto';
import type { PCode_Web_Controllers_PresetTaskSchemaSummaryDto } from '../models/PCode_Web_Controllers_PresetTaskSchemaSummaryDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PresetTasksService {
  /**
   * Lists the creation schema summary of every active HagiTask. Disabled tasks are not listed. Read-only.
   * @returns PCode_Web_Controllers_PresetTaskSchemaSummaryDto OK
   * @throws ApiError
   */
  public static getApiPresetTasksSchemas(): CancelablePromise<Array<PCode_Web_Controllers_PresetTaskSchemaSummaryDto>> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/preset-tasks/schemas',
      errors: {
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * Returns the creation schema of one active HagiTask: scope, commands, parameters, the JSON Schema of its input and an example.
   * Unknown and disabled ids answer 404 with the unavailable-task diagnostics. Read-only.
   * @returns PCode_Web_Controllers_PresetTaskCreationSchemaDto OK
   * @throws ApiError
   */
  public static getApiPresetTasksSchema({
    presetTaskId,
  }: {
    presetTaskId: string,
  }): CancelablePromise<PCode_Web_Controllers_PresetTaskCreationSchemaDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/preset-tasks/{presetTaskId}/schema',
      path: {
        'presetTaskId': presetTaskId,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
}

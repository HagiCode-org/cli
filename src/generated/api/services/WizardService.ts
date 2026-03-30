/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_InstallWizardComponentRequestDto } from '../models/PCode_Application_Contracts_Dto_InstallWizardComponentRequestDto';
import type { PCode_Application_Contracts_Dto_InstallWizardComponentResultDto } from '../models/PCode_Application_Contracts_Dto_InstallWizardComponentResultDto';
import type { PCode_Application_Contracts_Dto_WizardComponentDetectionResponseDto } from '../models/PCode_Application_Contracts_Dto_WizardComponentDetectionResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class WizardService {
  /**
   * Detects the installation status of wizard prerequisite components (node, npm, openspec).
   * @returns PCode_Application_Contracts_Dto_WizardComponentDetectionResponseDto Detection completed. Returns individual component statuses and step summary.
   * @throws ApiError
   */
  public static getApiWizardComponentsDetect(): CancelablePromise<PCode_Application_Contracts_Dto_WizardComponentDetectionResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/wizard/components/detect',
    });
  }
  /**
   * Installs a wizard prerequisite component. Only OpenSpec is supported for installation.
   * @returns PCode_Application_Contracts_Dto_InstallWizardComponentResultDto Installation completed (check Success field).
   * @throws ApiError
   */
  public static postApiWizardComponentsInstall({
    requestBody,
  }: {
    /**
     * The installation request specifying the component to install.
     */
    requestBody?: PCode_Application_Contracts_Dto_InstallWizardComponentRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_InstallWizardComponentResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/wizard/components/install',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid component ID (only "openspec" is supported).`,
      },
    });
  }
}

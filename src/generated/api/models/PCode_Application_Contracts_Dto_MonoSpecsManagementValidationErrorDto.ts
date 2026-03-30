/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementFieldErrorDto } from './PCode_Application_Contracts_Dto_MonoSpecsManagementFieldErrorDto';
export type PCode_Application_Contracts_Dto_MonoSpecsManagementValidationErrorDto = {
  /**
   * Error message describing what went wrong
   */
  error: string;
  /**
   * Optional machine-readable error code for client-side handling and diagnostics.
   */
  errorCode?: string | null;
  /**
   * Optional correlation identifier for tracing this error across logs and services.
   */
  correlationId?: string | null;
  fieldErrors?: Array<PCode_Application_Contracts_Dto_MonoSpecsManagementFieldErrorDto> | null;
};


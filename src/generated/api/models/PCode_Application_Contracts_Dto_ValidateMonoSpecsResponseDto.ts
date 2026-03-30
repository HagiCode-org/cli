/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_MonoSpecsConfigDetailsDto } from './PCode_Application_Contracts_Dto_MonoSpecsConfigDetailsDto';
/**
 * Response DTO for MonoSpecs configuration validation.
 */
export type PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto = {
  /**
   * Indicates whether the MonoSpecs configuration is valid.
   */
  isValid?: boolean;
  config?: PCode_Application_Contracts_Dto_MonoSpecsConfigDetailsDto;
  /**
   * List of warnings (non-critical issues).
   */
  warnings?: Array<string> | null;
  /**
   * List of errors (critical issues that prevent validation).
   */
  errors?: Array<string> | null;
};


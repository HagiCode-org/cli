/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_ValidationError } from './PCode_Application_DTOs_ValidationError';
import type { PCode_Application_DTOs_ValidationWarning } from './PCode_Application_DTOs_ValidationWarning';
/**
 * Validation result for prompt operations.
 */
export type PCode_Application_DTOs_ValidationResult = {
  /**
   * Whether the validation passed
   */
  isValid?: boolean;
  /**
   * Validation errors
   */
  errors?: Array<PCode_Application_DTOs_ValidationError> | null;
  /**
   * Validation warnings
   */
  warnings?: Array<PCode_Application_DTOs_ValidationWarning> | null;
};


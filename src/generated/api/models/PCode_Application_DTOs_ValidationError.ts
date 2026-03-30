/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Validation error detail
 */
export type PCode_Application_DTOs_ValidationError = {
  /**
   * Error type (syntax, metadata, parameter)
   */
  type?: string | null;
  /**
   * Error message
   */
  message?: string | null;
  /**
   * Line number (for syntax errors)
   */
  line?: number | null;
  /**
   * Column number (for syntax errors)
   */
  column?: number | null;
  /**
   * Field name (for metadata errors)
   */
  field?: string | null;
};


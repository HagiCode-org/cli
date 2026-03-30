/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Error details for failed quick action execution
 */
export type PCode_Application_Contracts_Dto_QuickActionErrorDto = {
  /**
   * Machine-readable error code for programmatic handling
   * Possible values:
   * - INVALID_REQUEST: Request parameters are invalid
   * - UNAUTHORIZED: User lacks permission to execute this command
   * - COMMAND_NOT_FOUND: Command is not in the whitelist
   * - EXECUTION_FAILED: Command execution failed
   * - TIMEOUT: Command execution exceeded timeout limit
   * - INVALID_WORKING_DIR: Working directory validation failed
   */
  code: string;
  /**
   * Human-readable error message
   * Safe to display to end users
   */
  message: string;
  /**
   * Additional error details
   * May contain stack traces, inner errors, etc.
   * Should not be displayed to end users in production
   */
  details?: any;
  /**
   * ISO 8601 timestamp when the error occurred
   */
  timestamp: string;
  /**
   * The correlation ID for tracking this error
   */
  correlationId: string;
};


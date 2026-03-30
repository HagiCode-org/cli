/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_QuickActionErrorDto } from './PCode_Application_Contracts_Dto_QuickActionErrorDto';
/**
 * Response DTO for quick action command execution
 */
export type PCode_Application_Contracts_Dto_QuickActionResponseDto = {
  /**
   * Whether the command executed successfully
   */
  success: boolean;
  /**
   * The exit code from the command process
   * 0 typically indicates success
   */
  exitCode: number;
  /**
   * Standard output from the command
   * May be truncated if output exceeds size limit
   */
  output?: string | null;
  /**
   * Standard error output from the command
   * Present if the command wrote to stderr
   */
  error?: string | null;
  /**
   * Execution time in milliseconds
   */
  executionTimeMs: number;
  /**
   * Correlation ID from the request for tracking
   */
  correlationId: string;
  errorDetails?: PCode_Application_Contracts_Dto_QuickActionErrorDto;
};


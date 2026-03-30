/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response DTO for starting an async description optimization task
 */
export type PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto = {
  /**
   * Unique identifier for the optimization task
   */
  taskId: string | null;
  /**
   * Current status of the optimization task
   */
  status: string | null;
  /**
   * The session ID being optimized
   */
  sessionId: string;
};


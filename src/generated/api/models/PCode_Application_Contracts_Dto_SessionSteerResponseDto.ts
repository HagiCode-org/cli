/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response DTO for steering a running session
 */
export type PCode_Application_Contracts_Dto_SessionSteerResponseDto = {
  /**
   * Steer outcome: `steered` when a running task took the message, `queued` when it was sent as the next message
   */
  outcome: string;
  /**
   * Id of the transcript message, when the backend returned one
   */
  messageId?: string;
};

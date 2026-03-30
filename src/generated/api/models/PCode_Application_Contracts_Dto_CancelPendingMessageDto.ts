/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_CancelledMessageInfo } from './PCode_Application_Contracts_Dto_CancelledMessageInfo';
/**
 * Response DTO for cancelling a specific pending message from the queue
 */
export type PCode_Application_Contracts_Dto_CancelPendingMessageDto = {
  /**
   * The session ID
   */
  sessionId: string | null;
  /**
   * Whether the message was successfully cancelled
   */
  success: boolean;
  /**
   * The queue index that was cancelled
   */
  queueIndex: number;
  /**
   * The number of messages remaining in the queue
   */
  remainingCount: number;
  /**
   * Message describing the result
   */
  message: string | null;
  cancelledMessage?: PCode_Application_Contracts_Dto_CancelledMessageInfo;
};


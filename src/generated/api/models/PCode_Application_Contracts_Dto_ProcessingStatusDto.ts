/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_QueueMessageSummaryDto } from './PCode_Models_QueueMessageSummaryDto';
/**
 * Processing status response DTO for a session
 */
export type PCode_Application_Contracts_Dto_ProcessingStatusDto = {
  /**
   * The session ID
   */
  sessionId: string;
  /**
   * Whether a message is currently being processed (not just queued)
   */
  isProcessing: boolean;
  /**
   * Number of messages currently in the queue
   */
  queuedMessageCount: number;
  /**
   * Details about queued messages (first 100 characters of content)
   */
  queueMessages: Array<PCode_Models_QueueMessageSummaryDto>;
};


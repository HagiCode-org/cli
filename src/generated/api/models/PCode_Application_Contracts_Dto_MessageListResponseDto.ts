/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_MessageResponseDto } from './PCode_Models_MessageResponseDto';
import type { PCode_Models_SessionId } from './PCode_Models_SessionId';
/**
 * Response DTO for a paginated list of messages
 */
export type PCode_Application_Contracts_Dto_MessageListResponseDto = {
  sessionId: PCode_Models_SessionId;
  /**
   * Current page number
   */
  page: number;
  /**
   * Number of items per page
   */
  pageSize: number;
  /**
   * Total number of messages
   */
  totalCount: number;
  /**
   * Total number of pages
   */
  totalPages: number;
  /**
   * List of messages
   */
  messages: Array<PCode_Models_MessageResponseDto>;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
/**
 * Request DTO for creating a normal chat session via the dedicated chat endpoint.
 */
export type PCode_Web_Controllers_CreateChatSessionRequest = {
  title: string;
  projectId: string;
  /**
   * Optional saved hero binding used to personalize normal chat sessions.
   */
  heroId?: string | null;
  executorType?: PCode_Models_AIProviderType;
};


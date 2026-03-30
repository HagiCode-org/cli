/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
import type { PCode_Models_SessionId } from './PCode_Models_SessionId';
import type { PCode_Models_SignalRDtoBase } from './PCode_Models_SignalRDtoBase';
export type PCode_Models_MessageCompletedDto = (PCode_Models_SignalRDtoBase & {
  sessionId: PCode_Models_SessionId;
  completedAt: string;
  totalChunks: number;
  providerType?: PCode_Models_AIProviderType;
  isProposal?: boolean;
  isAnnotation?: boolean;
  error?: string | null;
  isHistorical?: boolean;
});


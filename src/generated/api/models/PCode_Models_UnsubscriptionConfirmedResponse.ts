/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SessionId } from './PCode_Models_SessionId';
import type { PCode_Models_SignalRDtoBase } from './PCode_Models_SignalRDtoBase';
export type PCode_Models_UnsubscriptionConfirmedResponse = (PCode_Models_SignalRDtoBase & {
  sessionId: PCode_Models_SessionId;
  requestId?: string | null;
  mode?: string | null;
  unsubscribedAt?: string;
});


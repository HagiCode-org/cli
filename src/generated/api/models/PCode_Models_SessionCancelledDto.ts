/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SignalRDtoBase } from './PCode_Models_SignalRDtoBase';
export type PCode_Models_SessionCancelledDto = (PCode_Models_SignalRDtoBase & {
  sessionId: string;
  success: boolean;
  message: string;
  messagesCleared?: number | null;
  cancelType: string;
});


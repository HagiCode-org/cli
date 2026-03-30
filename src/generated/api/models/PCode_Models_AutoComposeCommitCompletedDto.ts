/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SignalRDtoBase } from './PCode_Models_SignalRDtoBase';
export type PCode_Models_AutoComposeCommitCompletedDto = (PCode_Models_SignalRDtoBase & {
  projectId: string;
  totalCount: number;
  successCount: number;
  failureCount: number;
  success: boolean;
  error?: string | null;
});


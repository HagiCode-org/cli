/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_MessageContentBlock } from './PCode_Models_MessageContentBlock';
export type PCode_Models_ResultContentBlock = (PCode_Models_MessageContentBlock & {
  subtype?: string | null;
  durationMs?: number;
  durationApiMs?: number;
  isError?: boolean;
  numTurns?: number;
  totalCostUsd?: number | null;
  usage?: string | null;
  result?: string | null;
});


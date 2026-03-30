/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_MessageContentBlock } from './PCode_Models_MessageContentBlock';
export type PCode_Models_CodeExecutionBlock = (PCode_Models_MessageContentBlock & {
  code?: string | null;
  language?: string | null;
  output?: string | null;
  errorOutput?: string | null;
  exitCode?: number | null;
  executionTimeMs?: number | null;
});


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_Citation } from './PCode_Models_Citation';
import type { PCode_Models_MessageContentBlock } from './PCode_Models_MessageContentBlock';
export type PCode_Models_DocumentContentBlock = (PCode_Models_MessageContentBlock & {
  source?: string | null;
  title?: string | null;
  mediaType?: string | null;
  citations?: Array<PCode_Models_Citation> | null;
  extractedText?: string | null;
  size?: number | null;
});


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_Citation } from './PCode_Models_Citation';
import type { PCode_Models_MessageContentBlock } from './PCode_Models_MessageContentBlock';
import type { PCode_Models_TextFormat } from './PCode_Models_TextFormat';
export type PCode_Models_TextContentBlock = (PCode_Models_MessageContentBlock & {
  text: string;
  format?: PCode_Models_TextFormat;
  citations?: Array<PCode_Models_Citation> | null;
});


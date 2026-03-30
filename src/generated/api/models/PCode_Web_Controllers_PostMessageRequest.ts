/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_SessionMessageImageRefDto } from './PCode_Application_DTOs_SessionMessageImageRefDto';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
import type { PCode_Models_MessageMode } from './PCode_Models_MessageMode';
export type PCode_Web_Controllers_PostMessageRequest = {
  content: string;
  mode?: PCode_Models_MessageMode;
  executorType?: PCode_Models_AIProviderType;
  imageRefs?: Array<PCode_Application_DTOs_SessionMessageImageRefDto> | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_CodeExecutionBlock } from './PCode_Models_CodeExecutionBlock';
import type { PCode_Models_DocumentContentBlock } from './PCode_Models_DocumentContentBlock';
import type { PCode_Models_ImageContentBlock } from './PCode_Models_ImageContentBlock';
import type { PCode_Models_MessageHeroSnapshotDto } from './PCode_Models_MessageHeroSnapshotDto';
import type { PCode_Models_MessageMode } from './PCode_Models_MessageMode';
import type { PCode_Models_MessageType } from './PCode_Models_MessageType';
import type { PCode_Models_ResultContentBlock } from './PCode_Models_ResultContentBlock';
import type { PCode_Models_SessionId } from './PCode_Models_SessionId';
import type { PCode_Models_TextContentBlock } from './PCode_Models_TextContentBlock';
import type { PCode_Models_ThinkingContentBlock } from './PCode_Models_ThinkingContentBlock';
import type { PCode_Models_ToolResultContentBlock } from './PCode_Models_ToolResultContentBlock';
import type { PCode_Models_ToolUseContentBlock } from './PCode_Models_ToolUseContentBlock';
export type PCode_Models_MessageResponseDto = {
  id: string;
  sessionId: PCode_Models_SessionId;
  type: PCode_Models_MessageType;
  mode: PCode_Models_MessageMode;
  timestamp: string;
  creationTime: string;
  contentBlocks: Array<(PCode_Models_CodeExecutionBlock | PCode_Models_DocumentContentBlock | PCode_Models_ImageContentBlock | PCode_Models_ResultContentBlock | PCode_Models_TextContentBlock | PCode_Models_ThinkingContentBlock | PCode_Models_ToolResultContentBlock | PCode_Models_ToolUseContentBlock)>;
  model: string | null;
  provider: string | null;
  heroSnapshot?: PCode_Models_MessageHeroSnapshotDto;
};


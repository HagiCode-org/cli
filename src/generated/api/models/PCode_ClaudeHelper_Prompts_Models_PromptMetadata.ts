/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_ClaudeHelper_Prompts_Configuration_PromptSource } from './PCode_ClaudeHelper_Prompts_Configuration_PromptSource';
import type { PCode_ClaudeHelper_Prompts_Models_PromptDungeonConfiguration } from './PCode_ClaudeHelper_Prompts_Models_PromptDungeonConfiguration';
import type { PCode_ClaudeHelper_Prompts_Models_PromptImageDefinition } from './PCode_ClaudeHelper_Prompts_Models_PromptImageDefinition';
import type { PCode_ClaudeHelper_Prompts_Models_PromptMetadataAppendices } from './PCode_ClaudeHelper_Prompts_Models_PromptMetadataAppendices';
import type { PCode_ClaudeHelper_Prompts_Models_PromptParameter } from './PCode_ClaudeHelper_Prompts_Models_PromptParameter';
export type PCode_ClaudeHelper_Prompts_Models_PromptMetadata = {
  scenario?: string | null;
  locale?: string | null;
  version?: string | null;
  templateRef?: string | null;
  appendices?: PCode_ClaudeHelper_Prompts_Models_PromptMetadataAppendices;
  syntax?: string | null;
  syntaxVersion?: string | null;
  parameters?: Array<PCode_ClaudeHelper_Prompts_Models_PromptParameter> | null;
  lastModified?: string | null;
  author?: string | null;
  description?: string | null;
  icon?: string | null;
  image?: PCode_ClaudeHelper_Prompts_Models_PromptImageDefinition;
  dungeon?: PCode_ClaudeHelper_Prompts_Models_PromptDungeonConfiguration;
  tags?: Array<string> | null;
  embeddedCommand?: string | null;
  source?: PCode_ClaudeHelper_Prompts_Configuration_PromptSource;
  lastModifiedAt?: string | null;
};


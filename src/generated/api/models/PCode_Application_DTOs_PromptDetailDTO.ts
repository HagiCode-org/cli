/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_PromptImageSummaryDto } from './PCode_Application_Contracts_Dto_PromptImageSummaryDto';
import type { PCode_ClaudeHelper_Prompts_Models_PromptMetadata } from './PCode_ClaudeHelper_Prompts_Models_PromptMetadata';
/**
 * Data transfer object for detailed prompt information.
 */
export type PCode_Application_DTOs_PromptDetailDTO = {
  /**
   * Unique identifier for the prompt (format: "scenario.locale")
   */
  id?: string | null;
  /**
   * Handlebars template content
   */
  template?: string | null;
  metadata?: PCode_ClaudeHelper_Prompts_Models_PromptMetadata;
  /**
   * Fixed stage style key for the scenario.
   */
  stageStyleKey?: string | null;
  /**
   * Human-readable stage style label.
   */
  stageStyleLabel?: string | null;
  /**
   * Fixed art style assignment.
   */
  artStyle?: string | null;
  /**
   * Fixed prompt image display mode.
   */
  displayMode?: string | null;
  /**
   * Fixed prompt direction used for batch image generation.
   */
  promptDirection?: string | null;
  imageSummary?: PCode_Application_Contracts_Dto_PromptImageSummaryDto;
};


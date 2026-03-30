/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_PromptImageSummaryDto } from './PCode_Application_Contracts_Dto_PromptImageSummaryDto';
import type { PCode_ClaudeHelper_Prompts_Configuration_PromptSource } from './PCode_ClaudeHelper_Prompts_Configuration_PromptSource';
import type { PCode_ClaudeHelper_Prompts_Models_PromptDungeonConfiguration } from './PCode_ClaudeHelper_Prompts_Models_PromptDungeonConfiguration';
/**
 * Data transfer object for prompt list items.
 */
export type PCode_Application_DTOs_PromptDTO = {
  /**
   * Unique identifier for the prompt (format: "scenario.locale")
   */
  id?: string | null;
  /**
   * Scenario name
   */
  scenario?: string | null;
  /**
   * Locale (e.g., "en-US", "zh-CN")
   */
  locale?: string | null;
  /**
   * Version
   */
  version?: string | null;
  source?: PCode_ClaudeHelper_Prompts_Configuration_PromptSource;
  /**
   * Description
   */
  description?: string | null;
  /**
   * Optional icon identifier for prompt display.
   */
  icon?: string | null;
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
  /**
   * Tags
   */
  tags?: Array<string> | null;
  dungeon?: PCode_ClaudeHelper_Prompts_Models_PromptDungeonConfiguration;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request DTO for creating an auto-task session with initial prompt.
 */
export type PCode_Web_Controllers_CreateAutoTaskSessionRequest = {
  /**
   * The title of the session (required)
   */
  title: string;
  /**
   * The project ID where the session will be created (required)
   */
  projectId: string;
  /**
   * The prompt template ID to use for the initial message (required)
   * Should be in format "scenario.locale" (e.g., "auto-compose-commit.en-US")
   * For user presets, use format "user-preset.{locale}" (e.g., "user-preset.zh-CN")
   */
  promptId: string;
  /**
   * Optional custom message to override the prompt template
   * If provided, this message will be used instead of loading from the prompt template
   * For user-preset scenarios, this parameter is required
   */
  message?: string | null;
  /**
   * Optional preset ID from frontend (for preset sessions)
   * Used for tracking and UI indication of preset origin
   * Stored in session metadata for retrieval and display
   */
  presetId?: string | null;
  /**
   * MonoSpecs sub-repository path (optional)
   * For MonoSpecs projects, this is the relative path to the sub-repository (e.g., "repos/web")
   * Use "." to target the main repository while still preserving root-repository identity in diagnostics.
   * The working directory will be resolved from project.Path plus repositoryPath when applicable.
   */
  repositoryPath?: string | null;
  /**
   * Multiple project IDs for hotword generation scenarios (optional)
   * Each entry is a project ID (GUID)
   * Used when user selects multiple projects to generate hotwords
   * Backend will fetch project details from database
   */
  projectIds?: Array<string> | null;
  /**
   * Whether to push to remote after commits are created (optional)
   * When true, the system will attempt to push after commits are made
   * When false or omitted, only local commits will be created
   */
  needPush?: boolean;
  /**
   * Optional target branch mode for auto compose commit
   * Supported values: current, new-custom, ai-generated-new
   */
  targetBranchMode?: string | null;
  /**
   * Optional custom branch name for auto compose commit
   * Required when TargetBranchMode is new-custom
   */
  targetBranchName?: string | null;
  /**
   * Optional stable dungeon script key for AutoTask dungeon routing.
   * This chooses which dungeon roster should resolve the active runtime hero.
   */
  scriptKey?: string | null;
  /**
   * Optional preferred hero ID for AutoTask dungeon routing.
   * When provided, runtime will use this enabled dungeon member before falling back to the captain hero.
   */
  heroId?: string | null;
};


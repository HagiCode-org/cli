/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_DTOs_SessionMessageImageRefDto } from './PCode_Application_DTOs_SessionMessageImageRefDto';
import type { PCode_Models_TargetProjectReferenceDto } from './PCode_Models_TargetProjectReferenceDto';
/**
 * Request DTO for creating a HagiTask session with initial prompt.
 */
export type PCode_Web_Controllers_CreateHagiTaskSessionRequest = {
  /**
   * The title of the session (required)
   */
  title: string;
  /**
   * Whether Title still represents a placeholder title that should be replaced by async conversation title optimization.
   */
  isDefaultTitle?: boolean;
  /**
   * The project ID where the session will be created (required)
   */
  projectId: string;
  /**
   * The prompt template ID to use for the initial message (required)
   * Should be in format "scenario.locale" (e.g., "auto-compose-commit.en-US" or "conversation-title-optimization.zh-CN")
   */
  promptId?: string | null;
  /**
   * Optional custom message to override the prompt template
   * If provided, this message will be used instead of loading from the prompt template
   */
  message?: string | null;
  /**
   * Images uploaded in the composer before the session existed. Draft links in Message (including the links that a
   * preset task renders from its inputs) are rewritten to the new session and attached to the first user message.
   */
  draftImageRefs?: Array<PCode_Application_DTOs_SessionMessageImageRefDto> | null;
  /**
   * MonoSpecs sub-repository path (optional)
   * For MonoSpecs projects, this is the relative path to the sub-repository (e.g., "repos/web")
   * Use "." to target the main repository while still preserving root-repository identity in diagnostics.
   * The working directory will be resolved from project.Path plus repositoryPath when applicable.
   */
  repositoryPath?: string | null;
  /**
   * Explicit target type for HagiTask execution.
   * Use "repository" for project-root or sub-repository flows, and "vault" for registered Vault targets.
   */
  targetType?: string | null;
  /**
   * Registered Vault ID for vault-targeted HagiTask execution.
   * Required when TargetType is "vault".
   */
  vaultId?: string | null;
  /**
   * Explicit output CodeRef Vault ID for research-investigation scenarios.
   * When omitted, the backend may temporarily fall back to VaultId for compatibility.
   */
  outputVaultId?: string | null;
  /**
   * Optional reference Vault IDs for research-investigation scenarios.
   * The backend trims whitespace, removes duplicates, and validates each referenced Vault.
   */
  referenceVaultIds?: Array<string> | null;
  /**
   * Optional Vault IDs the session may edit, in addition to reading them.
   * An editable Vault is also attached as a reference Vault; it does not change the working directory.
   * The backend trims whitespace, removes duplicates, and validates each Vault.
   */
  editableVaultIds?: Array<string> | null;
  /**
   * Optional target project references for HagiTask scenarios.
   * Each item is normalized against canonical project records before session creation.
   * The owner project may be included in this collection.
   */
  targetProjects?: Array<PCode_Models_TargetProjectReferenceDto> | null;
  /**
   * Structured research direction for research-investigation scenarios.
   * Required when using the bundled research-investigation preset task.
   */
  researchDirection?: string | null;
  /**
   * Preset-task identifier resolved by the backend catalog.
   */
  presetTaskId?: string | null;
  /**
   * Optional locale preference for plugin-backed preset task prompt resolution.
   */
  presetTaskLocale?: string | null;
  /**
   * Structured preset-task input payload.
   */
  presetTaskInput?: any;
  /**
   * Optional Git repository URLs for research-investigation scenarios.
   * The backend normalizes whitespace, drops blanks, and removes duplicates while preserving order.
   */
  repositoryUrls?: Array<string> | null;
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
   * Whether push-enabled auto compose runs should execute git pull --rebase before pushing.
   * Omitted values preserve the legacy direct-push behavior.
   */
  pullRebaseBeforePush?: boolean | null;
  /**
   * Optional target branch mode for Super Commit
   * Supported values: current, new-custom, ai-generated-new
   */
  targetBranchMode?: string | null;
  /**
   * Optional custom branch name for Super Commit
   * Required when TargetBranchMode is new-custom
   */
  targetBranchName?: string | null;
  /**
   * Optional stable scenario script key for HagiTask scenario routing.
   * This chooses which scenario roster should resolve the active runtime hero.
   */
  scriptKey?: string | null;
  /**
   * Optional preferred hero ID for HagiTask scenario routing.
   * When provided, runtime will use this enabled scenario member before falling back to the captain hero.
   */
  heroId?: string | null;
  /**
   * Optional Hero name, an alternative to heroId. Matched after trimming and ignoring case.
   * Giving both fields, or a name that matches no Hero, is rejected and no session is created.
   */
  heroName?: string | null;
  /**
   * Optional hero selection mode used when HeroId is not provided.
   * Supported values: first (default, also used when omitted or blank) and random.
   * Random picks uniformly among the eligible members of the first scenario tier that has any.
   * An explicit HeroId always takes precedence over this mode.
   */
  heroSelectionMode?: string | null;
};


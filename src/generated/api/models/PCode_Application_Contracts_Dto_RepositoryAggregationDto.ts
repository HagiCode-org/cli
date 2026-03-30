/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Repository-level aggregation DTO
 */
export type PCode_Application_Contracts_Dto_RepositoryAggregationDto = {
  /**
   * Repository name
   */
  name?: string | null;
  /**
   * Repository path relative to project root
   */
  path?: string | null;
  /**
   * Relative path, storing the original path as defined in configuration
   */
  relativePath?: string | null;
  /**
   * Repository display name
   */
  displayName?: string | null;
  /**
   * Repository type (e.g., "frontend", "backend", "library")
   */
  type?: string | null;
  /**
   * Icon for the repository (e.g., Unicode emoji like "🌐", "⚙️", "📚")
   */
  icon?: string | null;
  /**
   * Repository URL
   */
  url?: string | null;
  /**
   * Repository classification tags from monospecs.yaml
   */
  tags?: Array<string> | null;
  /**
   * Whether this is a valid Git repository
   */
  isValidGitRepo?: boolean;
  /**
   * Current branch name (if available)
   */
  branch?: string | null;
  /**
   * Whether there are uncommitted changes
   */
  hasUncommittedChanges?: boolean;
  /**
   * Number of unpushed commits
   */
  unpushedCommitCount?: number;
  /**
   * Whether the current branch tracks an upstream branch
   */
  hasTrackingBranch?: boolean;
  /**
   * Tracked upstream branch name (for example "origin/main")
   */
  trackingBranch?: string | null;
  /**
   * Number of commits the local branch is ahead of the tracked upstream branch
   */
  aheadCount?: number;
  /**
   * Number of commits the local branch is behind the tracked upstream branch
   */
  behindCount?: number;
  /**
   * Normalized local-vs-remote sync state.
   * Supported values: synced, ahead, behind, diverged, no_upstream.
   */
  syncState?: string | null;
  /**
   * Whether this is an optional repository
   */
  isOptional?: boolean;
  /**
   * Whether the name has been sanitized
   */
  isSanitized?: boolean;
  /**
   * Sanitization reason
   */
  sanitizationReason?: string | null;
  /**
   * Whether the name has a warning
   */
  hasNameWarning?: boolean;
  /**
   * List of name warnings
   */
  nameWarnings?: Array<string> | null;
};


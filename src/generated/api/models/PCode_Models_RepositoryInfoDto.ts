/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Models_RepositoryInfoDto = {
  name?: string | null;
  path?: string | null;
  relativePath?: string | null;
  isValidGitRepo?: boolean;
  branch?: string | null;
  hasUncommittedChanges?: boolean;
  unpushedCommitCount?: number;
  displayName?: string | null;
  type?: string | null;
  icon?: string | null;
  isOptional?: boolean;
  isSanitized?: boolean;
  sanitizationReason?: string | null;
  hasNameWarning?: boolean;
  nameWarnings?: Array<string> | null;
  url?: string | null;
  hasTrackingBranch?: boolean;
  trackingBranch?: string | null;
  aheadCount?: number;
  behindCount?: number;
  syncState?: string | null;
  tags?: Array<string> | null;
};


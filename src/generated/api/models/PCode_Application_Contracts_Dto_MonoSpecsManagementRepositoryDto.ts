/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementMetadataEntryDto } from './PCode_Application_Contracts_Dto_MonoSpecsManagementMetadataEntryDto';
export type PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto = {
  name?: string | null;
  code?: string | null;
  path?: string | null;
  url?: string | null;
  displayName?: string | null;
  type?: string | null;
  /**
   * The configured icon as stored in monospecs.yaml: an emoji, other text or a lucide:kebab-name reference.
   * Empty when no icon is configured. A legacy cat-xxxx value is returned as stored and is not a usable icon.
   */
  icon?: string | null;
  optional?: boolean;
  tags?: Array<string> | null;
  /**
   * The metadata entries of this repository in file order. Empty when the repository has no metadata node.
   */
  metadata?: Array<PCode_Application_Contracts_Dto_MonoSpecsManagementMetadataEntryDto> | null;
  isValidGitRepo?: boolean;
  branch?: string | null;
  hasUncommittedChanges?: boolean;
  unpushedCommitCount?: number;
  hasTrackingBranch?: boolean;
  trackingBranch?: string | null;
  aheadCount?: number;
  behindCount?: number;
  syncState?: string | null;
};


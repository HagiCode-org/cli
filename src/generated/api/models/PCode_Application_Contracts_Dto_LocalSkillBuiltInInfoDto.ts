/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Release-recorded metadata for one built-in skill, read from the built-in skills lock file.
 */
export type PCode_Application_Contracts_Dto_LocalSkillBuiltInInfoDto = {
  /**
   * Whether the skill is enabled. A built-in skill without a stored choice is enabled.
   */
  enabled?: boolean;
  version?: string | null;
  /**
   * Lock source type, for example `github` or `local`.
   */
  source?: string | null;
  repository?: string | null;
  ref?: string | null;
  /**
   * Folder path of the skill inside its source repository.
   */
  path?: string | null;
  contentHash?: string | null;
};


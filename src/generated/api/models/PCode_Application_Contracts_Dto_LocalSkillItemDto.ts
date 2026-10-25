/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_LocalSkillBuiltInInfoDto } from './PCode_Application_Contracts_Dto_LocalSkillBuiltInInfoDto';
import type { PCode_Application_Contracts_Dto_LocalSkillManagedInstallMetadataDto } from './PCode_Application_Contracts_Dto_LocalSkillManagedInstallMetadataDto';
export type PCode_Application_Contracts_Dto_LocalSkillItemDto = {
  id?: string | null;
  name?: string | null;
  scope?: string | null;
  path?: string | null;
  agents?: Array<string> | null;
  managedInstallMetadata?: PCode_Application_Contracts_Dto_LocalSkillManagedInstallMetadataDto;
  /**
   * Where the skill comes from: `user` for globally installed skills, `built-in` for skills shipped with the server release.
   */
  origin?: string | null;
  builtIn?: PCode_Application_Contracts_Dto_LocalSkillBuiltInInfoDto;
};


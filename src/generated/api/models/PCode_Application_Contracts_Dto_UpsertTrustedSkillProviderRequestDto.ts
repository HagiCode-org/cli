/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderMatchRuleDto } from './PCode_Application_Contracts_Dto_TrustedSkillProviderMatchRuleDto';
export type PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto = {
  providerId?: string | null;
  displayName?: string | null;
  badgeLabel?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
  matchRules?: Array<PCode_Application_Contracts_Dto_TrustedSkillProviderMatchRuleDto> | null;
};


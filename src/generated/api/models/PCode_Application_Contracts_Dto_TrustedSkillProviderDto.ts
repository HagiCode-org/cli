/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderMatchRuleDto } from './PCode_Application_Contracts_Dto_TrustedSkillProviderMatchRuleDto';
export type PCode_Application_Contracts_Dto_TrustedSkillProviderDto = {
  providerId?: string | null;
  displayName?: string | null;
  badgeLabel?: string | null;
  isPreset?: boolean;
  isEnabled?: boolean;
  sortOrder?: number;
  ruleCount?: number;
  sourceExamples?: Array<string> | null;
  matchRules?: Array<PCode_Application_Contracts_Dto_TrustedSkillProviderMatchRuleDto> | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto } from './PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto';
export type PCode_Application_Contracts_Dto_SkillRecommendationItemDto = {
  id?: string | null;
  name?: string | null;
  source?: string | null;
  skillSlug?: string | null;
  installs?: number;
  alreadyInstalled?: boolean;
  isInstallable?: boolean;
  recommendationState?: string | null;
  recommendationReason?: string | null;
  fitSummary?: string | null;
  matchedProjectNames?: Array<string> | null;
  selectionDisabledReason?: string | null;
  normalizedSkillKey?: string | null;
  installReference?: string | null;
  installCommandPreview?: string | null;
  installVersion?: string | null;
  isTrustedSource?: boolean;
  trustedProvider?: PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto;
};


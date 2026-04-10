/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto } from './PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto';
export type PCode_Application_Contracts_Dto_SkillGalleryInstallContextDto = {
  id?: string | null;
  source?: string | null;
  skillSlug?: string | null;
  isInstallable?: boolean;
  isTrustedSource?: boolean;
  trustedProvider?: PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto;
  installReference?: string | null;
  installCommandPreview?: string | null;
  installVersion?: string | null;
  installHint?: string | null;
};


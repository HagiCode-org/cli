/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto } from './PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto';
export type PCode_Application_Contracts_Dto_SkillGalleryDetailDto = {
  id?: string | null;
  source?: string | null;
  skillSlug?: string | null;
  description?: string | null;
  repositoryName?: string | null;
  repositoryFullName?: string | null;
  repositoryUrl?: string | null;
  repositoryDefaultBranch?: string | null;
  repositoryPrivate?: boolean | null;
  isInstallable?: boolean;
  isTrustedSource?: boolean;
  trustedProvider?: PCode_Application_Contracts_Dto_TrustedSkillProviderTrustSummaryDto;
  installReference?: string | null;
  installCommandPreview?: string | null;
  installVersion?: string | null;
  installHint?: string | null;
};


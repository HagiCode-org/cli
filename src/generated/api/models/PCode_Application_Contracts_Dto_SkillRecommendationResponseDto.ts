/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto } from './PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto';
import type { PCode_Application_Contracts_Dto_SkillRecommendationItemDto } from './PCode_Application_Contracts_Dto_SkillRecommendationItemDto';
export type PCode_Application_Contracts_Dto_SkillRecommendationResponseDto = {
  generatedAtUtc?: string;
  locale?: string | null;
  searchQueries?: Array<string> | null;
  items?: Array<PCode_Application_Contracts_Dto_SkillRecommendationItemDto> | null;
  warnings?: Array<string> | null;
  hasPartialContextFailures?: boolean;
  exploredProjectCount?: number;
  exploredRepositoryCount?: number;
  candidateCount?: number;
  effectiveSearchHero?: PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto;
  effectiveRankingHero?: PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto;
};


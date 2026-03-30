/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto } from './PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto';
import type { PCode_Application_Contracts_Dto_SkillRecommendationPromptSummaryDto } from './PCode_Application_Contracts_Dto_SkillRecommendationPromptSummaryDto';
export type PCode_Application_Contracts_Dto_SkillRecommendationConfigDto = {
  locale?: string | null;
  effectiveSearchHero?: PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto;
  effectiveRankingHero?: PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto;
  selectableHeroes?: Array<PCode_Application_Contracts_Dto_SkillRecommendationHeroSummaryDto> | null;
  searchPrompt?: PCode_Application_Contracts_Dto_SkillRecommendationPromptSummaryDto;
  rankingPrompt?: PCode_Application_Contracts_Dto_SkillRecommendationPromptSummaryDto;
};


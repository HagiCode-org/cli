/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroRealtimeDashboardLatestEventDto } from './PCode_Application_Contracts_Dto_HeroRealtimeDashboardLatestEventDto';
export type PCode_Application_Contracts_Dto_HeroRealtimeDashboardHeroCardDto = {
  heroId?: string | null;
  heroName?: string | null;
  heroIcon?: string | null;
  executorType?: string | null;
  rank?: number;
  status?: string | null;
  grade?: string | null;
  currentLevel?: number;
  totalExperience?: number;
  currentLevelStartExperience?: number;
  nextLevelExperience?: number;
  experienceProgressPercent?: number;
  remainingExperienceToNextLevel?: number;
  latestVisibleEvent?: PCode_Application_Contracts_Dto_HeroRealtimeDashboardLatestEventDto;
};


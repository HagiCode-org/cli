/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
export type PCode_Application_Contracts_Dto_HeroDungeonMemberDto = {
  heroId: string;
  name: string;
  icon?: string | null;
  description?: string | null;
  executorType?: PCode_Models_AIProviderType;
  isEnabled?: boolean;
  isMissing?: boolean;
  isDefault?: boolean;
  currentLevel?: number;
  totalExperience?: number;
  currentLevelStartExperience?: number;
  nextLevelExperience?: number;
  experienceProgressPercent?: number;
  remainingExperienceToNextLevel?: number;
  fallbackSource?: string | null;
};


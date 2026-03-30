/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroConfigurationDto } from './PCode_Application_Contracts_Dto_HeroConfigurationDto';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
export type PCode_Application_Contracts_Dto_HeroDto = {
  id?: string;
  name: string;
  executorType?: PCode_Models_AIProviderType;
  icon?: string | null;
  description?: string | null;
  soul?: string | null;
  /**
   * Published Marketplace source id for the canonical SOUL snapshot stored on this hero.
   * Historical free-text heroes can keep this field empty while still returning the persisted snapshot.
   */
  soulCatalogId?: string | null;
  soulDisplayName?: string | null;
  soulStyleType?: string | null;
  soulSummary?: string | null;
  model?: string | null;
  isEnabled?: boolean;
  isBuiltIn?: boolean;
  isReadOnly?: boolean;
  sortOrder?: number;
  sourceHeroId?: string | null;
  currentLevel?: number;
  totalExperience?: number;
  currentLevelStartExperience?: number;
  nextLevelExperience?: number;
  experienceProgressPercent?: number;
  remainingExperienceToNextLevel?: number;
  lastExperienceGain?: number;
  lastExperienceGainAtUtc?: string | null;
  primaryProfessionFamily?: string | null;
  secondaryProfessionFamily?: string | null;
  professionSummary?: string | null;
  /**
   * Snapshot reference to the selected primary profession template from centralized system settings.
   */
  cliEquipmentId: string;
  /**
   * Snapshot reference to the selected secondary profession template from centralized system settings.
   */
  modelEquipmentId: string;
  /**
   * Optional Fengluo snapshot that remains user-editable and is not part of the centralized system catalog.
   */
  styleEquipmentId?: string | null;
  configuration?: PCode_Application_Contracts_Dto_HeroConfigurationDto;
  creationTime?: string;
  lastModificationTime?: string | null;
};


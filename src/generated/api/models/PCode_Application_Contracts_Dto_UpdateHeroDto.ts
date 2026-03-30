/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroConfigurationDto } from './PCode_Application_Contracts_Dto_HeroConfigurationDto';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
export type PCode_Application_Contracts_Dto_UpdateHeroDto = {
  name: string;
  executorType: PCode_Models_AIProviderType;
  icon?: string | null;
  description?: string | null;
  soul?: string | null;
  /**
   * Optional binding to a published SOUL Marketplace entry that is currently selectable for the user.
   * Favorites are only a shortcut source on the client and are not required for this binding.
   */
  soulCatalogId?: string | null;
  model?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
  primaryProfessionFamily?: string | null;
  secondaryProfessionFamily?: string | null;
  professionSummary?: string | null;
  cliEquipmentId: string;
  modelEquipmentId: string;
  styleEquipmentId?: string | null;
  configuration: PCode_Application_Contracts_Dto_HeroConfigurationDto;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroPrimaryProfessionSettingDto } from './PCode_Application_Contracts_Dto_HeroPrimaryProfessionSettingDto';
import type { PCode_Application_Contracts_Dto_HeroSecondaryProfessionBranchDto } from './PCode_Application_Contracts_Dto_HeroSecondaryProfessionBranchDto';
import type { PCode_Application_Contracts_Dto_HeroSecondaryProfessionSettingDto } from './PCode_Application_Contracts_Dto_HeroSecondaryProfessionSettingDto';
import type { PCode_Application_Contracts_Dto_HeroSoulPresetDto } from './PCode_Application_Contracts_Dto_HeroSoulPresetDto';
import type { PCode_Application_Contracts_Dto_HeroTraitPresetDto } from './PCode_Application_Contracts_Dto_HeroTraitPresetDto';
import type { PCode_Application_Contracts_Dto_OpenCodeModelCatalogStatusDto } from './PCode_Application_Contracts_Dto_OpenCodeModelCatalogStatusDto';
import type { PCode_Application_Contracts_Dto_SecondaryProfessionCatalogStatusDto } from './PCode_Application_Contracts_Dto_SecondaryProfessionCatalogStatusDto';
export type PCode_Application_Contracts_Dto_HeroSystemSettingsDto = {
  primaryProfessions?: Array<PCode_Application_Contracts_Dto_HeroPrimaryProfessionSettingDto> | null;
  secondaryProfessions?: Array<PCode_Application_Contracts_Dto_HeroSecondaryProfessionSettingDto> | null;
  secondaryProfessionBranches?: Array<PCode_Application_Contracts_Dto_HeroSecondaryProfessionBranchDto> | null;
  compatibilityMatrix?: Record<string, Array<string>> | null;
  /**
   * Deprecated compatibility field kept for older clients. Trait discovery now lives on the standalone Trait platform.
   */
  traitPresets?: Array<PCode_Application_Contracts_Dto_HeroTraitPresetDto> | null;
  soulPresets?: Array<PCode_Application_Contracts_Dto_HeroSoulPresetDto> | null;
  secondaryProfessionCatalog?: PCode_Application_Contracts_Dto_SecondaryProfessionCatalogStatusDto;
  openCodeModelCatalog?: PCode_Application_Contracts_Dto_OpenCodeModelCatalogStatusDto;
};


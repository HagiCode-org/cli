/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroAvatarManifestEntryDto } from './PCode_Application_Contracts_Dto_HeroAvatarManifestEntryDto';
import type { PCode_Application_Contracts_Dto_HeroAvatarPluginPackageDto } from './PCode_Application_Contracts_Dto_HeroAvatarPluginPackageDto';
import type { PCode_Application_Contracts_Dto_HeroAvatarStylePackDto } from './PCode_Application_Contracts_Dto_HeroAvatarStylePackDto';
export type PCode_Application_Contracts_Dto_HeroAvatarCatalogDto = {
  catalogVersion?: string | null;
  generatedAtUtc?: string;
  defaultAvatarId?: string | null;
  featuredStyleKeys?: Array<string> | null;
  plugins?: Array<PCode_Application_Contracts_Dto_HeroAvatarPluginPackageDto> | null;
  disabledPlugins?: Array<PCode_Application_Contracts_Dto_HeroAvatarPluginPackageDto> | null;
  stylePacks?: Array<PCode_Application_Contracts_Dto_HeroAvatarStylePackDto> | null;
  entries?: Array<PCode_Application_Contracts_Dto_HeroAvatarManifestEntryDto> | null;
};


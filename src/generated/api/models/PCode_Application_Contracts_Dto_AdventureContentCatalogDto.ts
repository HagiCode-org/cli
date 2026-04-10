/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AdventureBranchLineDto } from './PCode_Application_Contracts_Dto_AdventureBranchLineDto';
import type { PCode_Application_Contracts_Dto_AdventureBranchVariantDto } from './PCode_Application_Contracts_Dto_AdventureBranchVariantDto';
import type { PCode_Application_Contracts_Dto_AdventureBucketDto } from './PCode_Application_Contracts_Dto_AdventureBucketDto';
import type { PCode_Application_Contracts_Dto_AdventureEventRulesDto } from './PCode_Application_Contracts_Dto_AdventureEventRulesDto';
import type { PCode_Application_Contracts_Dto_AdventureOutcomeFlavorDto } from './PCode_Application_Contracts_Dto_AdventureOutcomeFlavorDto';
import type { PCode_Application_Contracts_Dto_AdventurePlaylistDto } from './PCode_Application_Contracts_Dto_AdventurePlaylistDto';
import type { PCode_Application_Contracts_Dto_AdventurePluginDiagnosticDto } from './PCode_Application_Contracts_Dto_AdventurePluginDiagnosticDto';
import type { PCode_Application_Contracts_Dto_AdventurePluginPackageDto } from './PCode_Application_Contracts_Dto_AdventurePluginPackageDto';
import type { PCode_Application_Contracts_Dto_AdventureSceneDto } from './PCode_Application_Contracts_Dto_AdventureSceneDto';
import type { PCode_Application_Contracts_Dto_AdventureScoringDto } from './PCode_Application_Contracts_Dto_AdventureScoringDto';
import type { PCode_Application_Contracts_Dto_AdventureSituationDto } from './PCode_Application_Contracts_Dto_AdventureSituationDto';
import type { PCode_Application_Contracts_Dto_AdventureStyleDto } from './PCode_Application_Contracts_Dto_AdventureStyleDto';
import type { PCode_Application_Contracts_Dto_AdventureWeightProfileDto } from './PCode_Application_Contracts_Dto_AdventureWeightProfileDto';
export type PCode_Application_Contracts_Dto_AdventureContentCatalogDto = {
  catalogVersion?: string | null;
  generatedAtUtc?: string;
  plugins?: Array<PCode_Application_Contracts_Dto_AdventurePluginPackageDto> | null;
  disabledPlugins?: Array<PCode_Application_Contracts_Dto_AdventurePluginPackageDto> | null;
  diagnostics?: Array<PCode_Application_Contracts_Dto_AdventurePluginDiagnosticDto> | null;
  styles?: Array<PCode_Application_Contracts_Dto_AdventureStyleDto> | null;
  buckets?: Array<PCode_Application_Contracts_Dto_AdventureBucketDto> | null;
  scenes?: Array<PCode_Application_Contracts_Dto_AdventureSceneDto> | null;
  situations?: Array<PCode_Application_Contracts_Dto_AdventureSituationDto> | null;
  outcomes?: Array<PCode_Application_Contracts_Dto_AdventureOutcomeFlavorDto> | null;
  playlists?: Array<PCode_Application_Contracts_Dto_AdventurePlaylistDto> | null;
  scoring?: PCode_Application_Contracts_Dto_AdventureScoringDto;
  weightProfiles?: Array<PCode_Application_Contracts_Dto_AdventureWeightProfileDto> | null;
  eventRules?: PCode_Application_Contracts_Dto_AdventureEventRulesDto;
  branchLines?: Array<PCode_Application_Contracts_Dto_AdventureBranchLineDto> | null;
  branchVariants?: Array<PCode_Application_Contracts_Dto_AdventureBranchVariantDto> | null;
};


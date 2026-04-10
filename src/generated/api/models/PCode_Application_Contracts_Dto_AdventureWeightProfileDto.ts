/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AdventureArchetypeWeightDto } from './PCode_Application_Contracts_Dto_AdventureArchetypeWeightDto';
import type { PCode_Application_Contracts_Dto_AdventureSceneWeightDto } from './PCode_Application_Contracts_Dto_AdventureSceneWeightDto';
export type PCode_Application_Contracts_Dto_AdventureWeightProfileDto = {
  weightProfileId?: string | null;
  pluginId?: string | null;
  profileId?: string | null;
  sceneWeight?: PCode_Application_Contracts_Dto_AdventureSceneWeightDto;
  rareEventProbabilityPercent?: number;
  archetypeWeight?: PCode_Application_Contracts_Dto_AdventureArchetypeWeightDto;
};


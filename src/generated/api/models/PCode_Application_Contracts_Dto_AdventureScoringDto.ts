/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AdventureScoringResultTierDto } from './PCode_Application_Contracts_Dto_AdventureScoringResultTierDto';
import type { PCode_Application_Contracts_Dto_AdventureScoringTierDto } from './PCode_Application_Contracts_Dto_AdventureScoringTierDto';
export type PCode_Application_Contracts_Dto_AdventureScoringDto = {
  tiers?: Array<PCode_Application_Contracts_Dto_AdventureScoringTierDto> | null;
  resultTiers?: Array<PCode_Application_Contracts_Dto_AdventureScoringResultTierDto> | null;
  allowNegativeXp?: boolean;
  levelDown?: boolean;
  minLevelProgressRatio?: number;
};


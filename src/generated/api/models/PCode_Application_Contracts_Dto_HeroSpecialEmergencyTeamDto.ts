/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroDungeonMemberDto } from './PCode_Application_Contracts_Dto_HeroDungeonMemberDto';
export type PCode_Application_Contracts_Dto_HeroSpecialEmergencyTeamDto = {
  version?: number;
  /**
   * Persisted for configuration round-tripping only; runtime emergency resolution shuffles eligible members per parse.
   */
  members?: Array<PCode_Application_Contracts_Dto_HeroDungeonMemberDto> | null;
  legacyMigrated?: boolean;
  source?: string | null;
  legacySystemDefaultHeroId?: string | null;
};


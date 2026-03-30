/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_BatchCreateHeroAvatarStrategy } from './PCode_Application_Contracts_Dto_BatchCreateHeroAvatarStrategy';
/**
 * Shared batch-create request. The server resolves final hero names from either
 * the provided list or the random pool, then generates avatar ids and sort orders
 * so the entire batch can be created atomically.
 */
export type PCode_Application_Contracts_Dto_BatchCreateHeroDto = {
  count?: number;
  primaryProfessionId: string;
  secondaryProfessionId: string;
  avatarStrategy: PCode_Application_Contracts_Dto_BatchCreateHeroAvatarStrategy;
  avatarSeriesKey?: string | null;
  nameSeed?: number | null;
  heroNames?: Array<string> | null;
};


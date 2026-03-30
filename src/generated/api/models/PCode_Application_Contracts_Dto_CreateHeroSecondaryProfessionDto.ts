/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto } from './PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto';
export type PCode_Application_Contracts_Dto_CreateHeroSecondaryProfessionDto = {
  id?: string | null;
  primaryProfessionId: string;
  name: string;
  family?: string | null;
  summary?: string | null;
  icon?: string | null;
  sourceLabel?: string | null;
  sortOrder?: number | null;
  supportsImage?: boolean;
  defaultParameters?: Record<string, string | null> | null;
  fieldConstraints?: Array<PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto> | null;
};


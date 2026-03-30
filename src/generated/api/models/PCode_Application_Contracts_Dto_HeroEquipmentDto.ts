/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto } from './PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto';
export type PCode_Application_Contracts_Dto_HeroEquipmentDto = {
  equipmentId: string;
  name: string;
  summary?: string | null;
  family?: string | null;
  icon?: string | null;
  parentPrimaryProfessionId?: string | null;
  source?: string | null;
  sourceTemplateId?: string | null;
  isReadOnly?: boolean | null;
  fieldConstraints?: Array<PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto> | null;
  parameters?: Record<string, string | null> | null;
};


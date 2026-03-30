/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto } from './PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto';
export type PCode_Application_Contracts_Dto_HeroSecondaryProfessionSettingDto = {
  id?: string | null;
  name?: string | null;
  family?: string | null;
  primaryProfessionId?: string | null;
  primaryProfessionFamily?: string | null;
  /**
   * Stable frontend localization key for the profession summary.
   */
  summary?: string | null;
  icon?: string | null;
  /**
   * Stable frontend localization key for the source label.
   */
  sourceLabel?: string | null;
  sortOrder?: number;
  supportsImage?: boolean;
  isReadOnly?: boolean;
  isEditable?: boolean;
  source?: string | null;
  sourceTemplateId?: string | null;
  compatiblePrimaryFamilies?: Array<string> | null;
  defaultParameters?: Record<string, string | null> | null;
  fieldConstraints?: Array<PCode_Application_Contracts_Dto_HeroSecondaryProfessionFieldConstraintDto> | null;
};


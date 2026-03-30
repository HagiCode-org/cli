/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroEquipmentDto } from './PCode_Application_Contracts_Dto_HeroEquipmentDto';
import type { PCode_Application_Contracts_Dto_HeroTraitDto } from './PCode_Application_Contracts_Dto_HeroTraitDto';
export type PCode_Application_Contracts_Dto_HeroConfigurationDto = {
  cli?: PCode_Application_Contracts_Dto_HeroEquipmentDto;
  model?: PCode_Application_Contracts_Dto_HeroEquipmentDto;
  style?: PCode_Application_Contracts_Dto_HeroEquipmentDto;
  primaryProfessionFamily?: string | null;
  secondaryProfessionFamily?: string | null;
  professionSummary?: string | null;
  /**
   * Ordered trait snapshots that define the hero's knowledge and behavior.
   * Array order is the runtime emission order.
   */
  traits?: Array<PCode_Application_Contracts_Dto_HeroTraitDto> | null;
  additionalSettings?: Record<string, string | null> | null;
};


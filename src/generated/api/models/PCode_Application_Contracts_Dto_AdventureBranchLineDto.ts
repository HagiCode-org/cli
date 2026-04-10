/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AdventureBranchActivationRuleDto } from './PCode_Application_Contracts_Dto_AdventureBranchActivationRuleDto';
import type { PCode_Application_Contracts_Dto_AdventureBranchStateDto } from './PCode_Application_Contracts_Dto_AdventureBranchStateDto';
export type PCode_Application_Contracts_Dto_AdventureBranchLineDto = {
  branchLineId?: string | null;
  pluginId?: string | null;
  defaultStateId?: string | null;
  states?: Array<PCode_Application_Contracts_Dto_AdventureBranchStateDto> | null;
  activationRules?: Array<PCode_Application_Contracts_Dto_AdventureBranchActivationRuleDto> | null;
};


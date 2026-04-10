/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProposalOptimizationBundleValidationResultDto } from './PCode_Application_Contracts_Dto_ProposalOptimizationBundleValidationResultDto';
import type { PCode_Application_Contracts_Dto_ProposalOptimizationDungeonSettingsDto } from './PCode_Application_Contracts_Dto_ProposalOptimizationDungeonSettingsDto';
import type { PCode_Application_Contracts_Dto_ProposalOptimizationKeywordResultDto } from './PCode_Application_Contracts_Dto_ProposalOptimizationKeywordResultDto';
export type PCode_Application_Contracts_Dto_ProposalOptimizationBundleResultDto = {
  optimizedTitle?: string | null;
  optimizedProposalMarkdown?: string | null;
  optimizedProposalName?: string | null;
  optimizedDescription?: string | null;
  keywords?: Array<PCode_Application_Contracts_Dto_ProposalOptimizationKeywordResultDto> | null;
  dungeonSettings?: PCode_Application_Contracts_Dto_ProposalOptimizationDungeonSettingsDto;
  validation?: PCode_Application_Contracts_Dto_ProposalOptimizationBundleValidationResultDto;
  rawResponse?: string | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProposalOptimizationDungeonSettingsDto } from './PCode_Application_Contracts_Dto_ProposalOptimizationDungeonSettingsDto';
export type PCode_Web_Controllers_OptimizeProposalRequest = {
  description: string;
  /**
   * Optional optimization direction provided by user to guide AI optimization
   */
  optimizationDirection?: string | null;
  /**
   * Optional client-side title snapshot. When omitted the current session title is used.
   */
  title?: string | null;
  /**
   * Whether title is default placeholder "新建主意" (New Proposal).
   * When true, title should not be used as a semantic optimization constraint.
   */
  isDefaultTitle?: boolean;
  /**
   * Original chief complaint captured before additional drafting edits were applied.
   */
  originalChiefComplaint?: string | null;
  dungeonSettings?: PCode_Application_Contracts_Dto_ProposalOptimizationDungeonSettingsDto;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request DTO for generating a proposal
 */
export type PCode_Application_Contracts_Dto_GenerateProposalRequestDto = {
  /**
   * Whether to enable explore mode during proposal generation.
   * When true, the proposal generation will include an explore step for deeper analysis.
   * When false, the proposal generation will skip the explore step for faster results.
   * If not specified, defaults to true (explore mode enabled).
   */
  enableExploreMode?: boolean | null;
  /**
   * Optional hero override for this proposal generation request.
   * The hero must belong to the generate-stage script roster and be eligible.
   */
  heroId?: string | null;
};


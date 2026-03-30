/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response DTO for proposal name correction
 */
export type PCode_Application_Contracts_Dto_CorrectProposalNameResponseDto = {
  /**
   * The ID of the session that was corrected
   */
  sessionId?: string;
  /**
   * The old proposal name before correction
   */
  oldProposalName?: string | null;
  /**
   * The new proposal name after correction
   */
  newProposalName: string | null;
  /**
   * When the correction was applied (UTC)
   */
  correctedAt?: string;
};


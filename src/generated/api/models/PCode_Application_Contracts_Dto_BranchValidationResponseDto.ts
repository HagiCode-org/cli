/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Response DTO for branch validation
 */
export type PCode_Application_Contracts_Dto_BranchValidationResponseDto = {
  /**
   * Whether the branch exists in the repository
   */
  exists: boolean;
  /**
   * Whether the branch name is syntactically valid for Git
   */
  isValid?: boolean;
  /**
   * Whether the branch name can be used to create a new branch
   */
  isAvailable?: boolean;
  /**
   * The name of the branch that was validated
   */
  branchName: string | null;
};


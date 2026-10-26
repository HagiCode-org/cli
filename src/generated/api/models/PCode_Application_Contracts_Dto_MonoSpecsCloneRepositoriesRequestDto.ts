/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoriesRequestDto = {
  /**
   * Configured repository paths to clone. Empty selects every configured repository that is missing on disk.
   */
  paths?: Array<string> | null;
  /**
   * Whether optional repositories are included when Paths is empty.
   */
  includeOptional?: boolean;
};


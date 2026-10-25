/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Structured result for a built-in skill availability change.
 * `Enabled` is the state the skill has after the call; after a failure it is the state from before the call.
 */
export type PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto = {
  slug?: string | null;
  enabled?: boolean;
  succeeded?: boolean;
  userMessage?: string | null;
  diagnosticMessage?: string | null;
};


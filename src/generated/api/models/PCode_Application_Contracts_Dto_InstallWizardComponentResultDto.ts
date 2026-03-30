/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Result DTO for a wizard component installation attempt.
 */
export type PCode_Application_Contracts_Dto_InstallWizardComponentResultDto = {
  /**
   * Whether the installation succeeded.
   */
  success?: boolean;
  /**
   * Human-readable result message for the user.
   */
  message: string;
  /**
   * Diagnostic output from the installation process (may be truncated).
   */
  diagnosticOutput?: string | null;
};


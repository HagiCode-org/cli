/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Error contract returned by the character template proxy.
 */
export type PCode_Web_Controllers_CharacterTemplateProxyErrorResponse = {
  /**
   * Machine-readable error identifier.
   */
  error?: string | null;
  /**
   * Human-readable explanation of the failure.
   */
  message?: string | null;
  /**
   * Optional upstream HTTP status surfaced for diagnostics.
   */
  upstreamStatus?: number | null;
};


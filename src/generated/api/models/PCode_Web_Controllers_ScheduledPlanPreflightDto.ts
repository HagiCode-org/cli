/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Optional check that runs before a plan's session. `file` is relative to the project root.
 */
export type PCode_Web_Controllers_ScheduledPlanPreflightDto = {
  /**
   * Runtime that runs the script, such as `node` or `bash`.
   */
  runtime?: string | null;
  /**
   * Script file, relative to the project root.
   */
  file?: string | null;
  /**
   * Seconds before the check is stopped. Absent means no timeout.
   */
  timeoutSeconds?: number | null;
};

/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Quota-reset condition of a `quotaReset` schedule. Hand-maintained: mirrors `hagicode.community.v1.ScheduledPlanQuotaResetDto`.
 */
export type PCode_Web_Controllers_ScheduledPlanQuotaResetDto = {
  /**
   * Quota window the reset belongs to, such as `claudeFiveHour`.
   */
  window?: string | null;
  /**
   * Minimum remaining quota percent, 1 to 100.
   */
  minRemainingPercent?: number | null;
  /**
   * Maximum minutes before the reset at which the plan may trigger, 1 to 300.
   */
  maxMinutesBeforeReset?: number | null;
  /**
   * The trigger waits for a manual confirmation (`hagi plan confirm`).
   */
  requireManualConfirmation?: boolean | null;
  /**
   * No confirmation is asked during unattended hours.
   */
  skipConfirmationDuringUnattendedHours?: boolean | null;
};

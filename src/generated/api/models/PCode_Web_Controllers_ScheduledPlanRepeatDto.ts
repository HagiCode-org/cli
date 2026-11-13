/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Web_Controllers_ScheduledPlanRepeatDto = {
  /**
   * `daily`, `weekly` or `interval`.
   */
  rule?: string | null;
  /**
   * monday..sunday, required for `weekly`.
   */
  weekdays?: Array<string> | null;
  /**
   * Interval rule only: window start A, an instant (ISO-8601, UTC on the wire).
   */
  windowStart?: string | null;
  /**
   * Interval rule only: window end B, an instant. B itself is a valid trigger time.
   */
  windowEnd?: string | null;
  /**
   * Interval rule only: first trigger C, an instant with A <= C < B.
   */
  firstRunAt?: string | null;
  /**
   * Interval rule only: interval D in whole minutes, at least 5.
   */
  intervalMinutes?: number | null;
};

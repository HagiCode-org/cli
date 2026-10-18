/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Web_Controllers_ScheduledPlanRepeatDto = {
  /**
   * `daily` or `weekly`.
   */
  rule?: string | null;
  /**
   * monday..sunday, required for `weekly`.
   */
  weekdays?: Array<string> | null;
};

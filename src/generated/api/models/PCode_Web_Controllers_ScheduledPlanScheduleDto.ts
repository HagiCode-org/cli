/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_ScheduledPlanRepeatDto } from './PCode_Web_Controllers_ScheduledPlanRepeatDto';
/**
 * Schedule of a plan. `once` uses PCode.Web.Controllers.ScheduledPlanScheduleDto.RunAt; `recurring` uses the range, time of day and repeat.
 */
export type PCode_Web_Controllers_ScheduledPlanScheduleDto = {
  /**
   * `once` or `recurring`.
   */
  mode?: string | null;
  /**
   * Run instant for a one-time plan.
   */
  runAt?: string | null;
  /**
   * IANA time zone id for a recurring plan.
   */
  timeZone?: string | null;
  /**
   * First local date (yyyy-MM-dd), inclusive.
   */
  startDate?: string | null;
  /**
   * Last local date (yyyy-MM-dd), inclusive.
   */
  endDate?: string | null;
  /**
   * Local time of day (HH:mm).
   */
  timeOfDay?: string | null;
  repeat?: PCode_Web_Controllers_ScheduledPlanRepeatDto;
};

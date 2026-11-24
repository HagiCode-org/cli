/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_ScheduledPlanAgentPoolDto } from './PCode_Web_Controllers_ScheduledPlanAgentPoolDto';
import type { PCode_Web_Controllers_ScheduledPlanPreflightDto } from './PCode_Web_Controllers_ScheduledPlanPreflightDto';
import type { PCode_Web_Controllers_ScheduledPlanScheduleDto } from './PCode_Web_Controllers_ScheduledPlanScheduleDto';
/**
 * Create and update body. PCode.Web.Controllers.ScheduledPlanSaveRequest.Payload carries the inputs of the matching creation request
 * (proposal or HagiTask) with the same field names. It never carries origin metadata or draft images.
 */
export type PCode_Web_Controllers_ScheduledPlanSaveRequest = {
  /**
   * `proposal` or `hagitask`.
   */
  type?: string | null;
  name?: string | null;
  enabled?: boolean;
  schedule?: PCode_Web_Controllers_ScheduledPlanScheduleDto;
  agentPool?: PCode_Web_Controllers_ScheduledPlanAgentPoolDto;
  /**
   * The inputs of the matching creation request, as a JSON object. A HagiTask payload carries its repositories, vaults
   * and projects in one `scope` object, the same shape as the creation request.
   */
  payload?: any;
  /**
   * Preflight check. On update, `null` or an omitted value clears it, so the CLI sends the stored value back unless the user changes it.
   */
  preflight?: PCode_Web_Controllers_ScheduledPlanPreflightDto | null;
};

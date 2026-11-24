/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_ScheduledPlanAgentPoolDto } from './PCode_Web_Controllers_ScheduledPlanAgentPoolDto';
import type { PCode_Web_Controllers_ScheduledPlanPendingQuotaTriggerDto } from './PCode_Web_Controllers_ScheduledPlanPendingQuotaTriggerDto';
import type { PCode_Web_Controllers_ScheduledPlanPreflightDto } from './PCode_Web_Controllers_ScheduledPlanPreflightDto';
import type { PCode_Web_Controllers_ScheduledPlanScheduleDto } from './PCode_Web_Controllers_ScheduledPlanScheduleDto';
export type PCode_Web_Controllers_ScheduledPlanResponse = {
  id?: string | null;
  type?: string | null;
  name?: string | null;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  schedule?: PCode_Web_Controllers_ScheduledPlanScheduleDto;
  agentPool?: PCode_Web_Controllers_ScheduledPlanAgentPoolDto;
  payload?: any;
  preflight?: PCode_Web_Controllers_ScheduledPlanPreflightDto;
  /**
   * `scheduled` or `completed`.
   */
  state?: string | null;
  /**
   * Next automatic run time; `null` once completed.
   */
  nextRunAt?: string | null;
  /**
   * Last quota reset the plan ran for; `null` when it has never triggered on one.
   */
  lastTriggeredResetAt?: string | null;
  /**
   * Quota-reset trigger that waits for manual confirmation; `null` when none is pending.
   */
  pendingQuotaTrigger?: PCode_Web_Controllers_ScheduledPlanPendingQuotaTriggerDto | null;
};

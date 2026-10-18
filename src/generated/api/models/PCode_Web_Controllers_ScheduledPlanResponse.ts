/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_ScheduledPlanAgentPoolDto } from './PCode_Web_Controllers_ScheduledPlanAgentPoolDto';
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
  /**
   * `scheduled` or `completed`.
   */
  state?: string | null;
  /**
   * Next automatic run time; `null` once completed.
   */
  nextRunAt?: string | null;
};

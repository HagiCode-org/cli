/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_ScheduledPlanAgentDto } from './PCode_Web_Controllers_ScheduledPlanAgentDto';
export type PCode_Web_Controllers_ScheduledPlanAgentPoolDto = {
  /**
   * Selection strategy. Only `random` is supported.
   */
  strategy?: string | null;
  /**
   * Exactly one agent in this release.
   */
  agents?: Array<PCode_Web_Controllers_ScheduledPlanAgentDto> | null;
};

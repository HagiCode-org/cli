/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A quota-reset trigger that waits for manual confirmation. Hand-maintained: mirrors `hagicode.community.v1.ScheduledPlanPendingQuotaTriggerDto`.
 */
export type PCode_Web_Controllers_ScheduledPlanPendingQuotaTriggerDto = {
  /**
   * When the trigger was raised (ISO-8601 instant).
   */
  raisedAt?: string | null;
  /**
   * The quota reset the trigger belongs to (ISO-8601 instant).
   */
  windowResetAt?: string | null;
};

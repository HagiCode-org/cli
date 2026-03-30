/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Application_Contracts_Dto_UpdateHeroSpecialEmergencyTeamDto = {
  heroIds: Array<string>;
  /**
   * Optional optimistic concurrency token. Identical retries may still succeed with a stale version when the
   * normalized heroIds already match the persisted emergency-team snapshot.
   */
  expectedVersion?: number | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HagipowerBindingDto } from './PCode_Application_Contracts_Dto_HagipowerBindingDto';
export type PCode_Application_Contracts_Dto_HagipowerStatusDto = {
  /**
   * Post-allocation public-pool HagiPower currently available to the system.
   */
  publicBalance?: number;
  /**
   * Sum of the current public pool and all current post-allocation hero-bound balances.
   */
  totalBalance?: number;
  /**
   * Timestamp of the latest successful HagiPower balance mutation.
   */
  updatedAtUtc?: string | null;
  /**
   * Current post-allocation hero-bound balances. Values are not backfilled if the allocation ratio changes later.
   */
  bindings?: Array<PCode_Application_Contracts_Dto_HagipowerBindingDto> | null;
};


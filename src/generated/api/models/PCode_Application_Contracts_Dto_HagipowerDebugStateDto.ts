/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HagipowerDebugBindingDto } from './PCode_Application_Contracts_Dto_HagipowerDebugBindingDto';
export type PCode_Application_Contracts_Dto_HagipowerDebugStateDto = {
  /**
   * Indicates that the debug balance endpoint is currently active and can be called directly.
   */
  enabled?: boolean;
  publicBalance?: number;
  totalBalance?: number;
  minimumAllowedBalance?: number;
  maximumAllowedBalance?: number;
  updatedAtUtc?: string | null;
  bindings?: Array<PCode_Application_Contracts_Dto_HagipowerDebugBindingDto> | null;
};


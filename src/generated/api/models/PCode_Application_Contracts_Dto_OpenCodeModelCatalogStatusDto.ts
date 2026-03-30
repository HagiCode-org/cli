/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_OpenCodeModelCatalogEntryDto } from './PCode_Application_Contracts_Dto_OpenCodeModelCatalogEntryDto';
export type PCode_Application_Contracts_Dto_OpenCodeModelCatalogStatusDto = {
  entries?: Array<PCode_Application_Contracts_Dto_OpenCodeModelCatalogEntryDto> | null;
  lastAttemptedAt?: string | null;
  lastSuccessfulRefreshAt?: string | null;
  isStale?: boolean;
  source?: string | null;
  lastError?: string | null;
  refreshDurationMs?: number | null;
};


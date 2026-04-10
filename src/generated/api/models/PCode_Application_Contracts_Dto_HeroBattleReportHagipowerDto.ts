/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroBattleReportHagipowerPointDto } from './PCode_Application_Contracts_Dto_HeroBattleReportHagipowerPointDto';
export type PCode_Application_Contracts_Dto_HeroBattleReportHagipowerDto = {
  rangeStartUtc?: string;
  rangeEndUtc?: string;
  bucketMinutes?: number;
  hasFilledGaps?: boolean;
  hasRecordedHistory?: boolean;
  currentPublicBalance?: number;
  currentTotalBalance?: number;
  currentAccumulatedTotalBalance?: number;
  netChange?: number;
  lastUpdatedAtUtc?: string | null;
  publicSeries?: Array<PCode_Application_Contracts_Dto_HeroBattleReportHagipowerPointDto> | null;
};


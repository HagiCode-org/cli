/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SignalRDtoBase } from './PCode_Models_SignalRDtoBase';
export type PCode_Models_HeroStatusBarHistoryUpdatedDto = (PCode_Models_SignalRDtoBase & {
  historyKey: string;
  heroId: string;
  heroName: string;
  heroIcon?: string | null;
  eventType: string;
  occurredAtUtc: string;
  sourceCategory: string;
  sourceId?: string | null;
  summary: string;
  status?: string | null;
  experienceDelta?: number | null;
  levelBefore?: number | null;
  levelAfter?: number | null;
  payload?: any;
});


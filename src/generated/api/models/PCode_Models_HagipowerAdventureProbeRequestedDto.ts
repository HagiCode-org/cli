/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SignalRDtoBase } from './PCode_Models_SignalRDtoBase';
export type PCode_Models_HagipowerAdventureProbeRequestedDto = (PCode_Models_SignalRDtoBase & {
  probeId: string;
  heroId: string;
  heroName?: string | null;
  pluginId: string;
  styleId: string;
  sceneId: string;
  sceneTitleKey: string;
  sceneSummaryKey: string;
  fallbackTitle: string;
  fallbackSummary: string;
  costPowerM: number;
  createdAtUtc: string;
  expiresAtUtc: string;
  textArgs?: Record<string, string> | null;
});


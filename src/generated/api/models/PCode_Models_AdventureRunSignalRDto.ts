/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AdventureOutcomeSignalRDto } from './PCode_Models_AdventureOutcomeSignalRDto';
import type { PCode_Models_AdventureRunStepSignalRDto } from './PCode_Models_AdventureRunStepSignalRDto';
export type PCode_Models_AdventureRunSignalRDto = {
  runId: string;
  probeId: string;
  heroId: string;
  heroName?: string | null;
  status: string;
  pluginId: string;
  styleId: string;
  sceneId: string;
  sceneTitleKey: string;
  sceneSummaryKey: string;
  sceneDescriptionKey: string;
  fallbackTitle: string;
  fallbackSummary: string;
  fallbackDescription: string;
  costPowerM: number;
  startedAtUtc: string;
  endsAtUtc: string;
  currentStepIndex: number;
  totalSteps: number;
  scoreTotal: number;
  textArgs?: Record<string, string> | null;
  steps?: Array<PCode_Models_AdventureRunStepSignalRDto> | null;
  finalOutcome?: PCode_Models_AdventureOutcomeSignalRDto;
};


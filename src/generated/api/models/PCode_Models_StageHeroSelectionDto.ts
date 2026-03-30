/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
export type PCode_Models_StageHeroSelectionDto = {
  stageKey?: string | null;
  scriptKey?: string | null;
  dungeonName?: string | null;
  heroId?: string | null;
  heroName?: string | null;
  heroIcon?: string | null;
  executorType?: PCode_Models_AIProviderType;
  usedFallback?: boolean;
  selectionSource?: string | null;
  selectedAt?: string;
};


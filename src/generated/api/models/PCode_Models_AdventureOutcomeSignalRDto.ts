/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Models_AdventureOutcomeSignalRDto = {
  pluginId: string;
  playlistId: string;
  outcomeFlavorId: string;
  resultTier: string;
  completionKey: string;
  fallbackCompletion: string;
  xpDelta: number;
  requestedXpDelta: number;
  scoreTotal: number;
  durationSeconds: number;
  wasClampedToLevelFloor: boolean;
  textArgs?: Record<string, string> | null;
  currentLevel?: number | null;
  currentLevelStartExperience?: number | null;
  nextLevelExperience?: number | null;
  totalExperienceAfter?: number | null;
  remainingExperienceToNextLevel?: number | null;
};


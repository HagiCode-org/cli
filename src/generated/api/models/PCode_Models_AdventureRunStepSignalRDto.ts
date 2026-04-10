/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Models_AdventureRunStepSignalRDto = {
  stepIndex: number;
  pluginId: string;
  playlistId: string;
  sceneId: string;
  situationId: string;
  eventType: string;
  scheduledAtUtc: string;
  titleKey: string;
  summaryKey: string;
  descriptionKey: string;
  fallbackTitle: string;
  fallbackSummary: string;
  fallbackDescription: string;
  textArgs?: Record<string, string> | null;
  scoreDelta: number;
  isRevealed: boolean;
};


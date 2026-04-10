/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AdventurePlaylistStepScheduleDto } from './PCode_Application_Contracts_Dto_AdventurePlaylistStepScheduleDto';
export type PCode_Application_Contracts_Dto_AdventurePlaylistDto = {
  playlistId?: string | null;
  pluginId?: string | null;
  styleId?: string | null;
  profileId?: string | null;
  applicableBuckets?: Array<string> | null;
  stepCountMin?: number;
  stepCountMax?: number;
  durationMinSeconds?: number;
  durationMaxSeconds?: number;
  climaxRequired?: boolean;
  weightProfileId?: string | null;
  allowedArchetypes?: Array<string> | null;
  stepSchedule?: Array<PCode_Application_Contracts_Dto_AdventurePlaylistStepScheduleDto> | null;
};


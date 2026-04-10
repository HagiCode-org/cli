/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VoiceReminderPluginDiagnosticDto } from './PCode_Application_Contracts_Dto_VoiceReminderPluginDiagnosticDto';
export type PCode_Application_Contracts_Dto_VoiceReminderPluginPackageDto = {
  pluginId?: string | null;
  displayName?: string | null;
  version?: string | null;
  description?: string | null;
  sourceKind?: string | null;
  status?: string | null;
  isBundled?: boolean;
  isSelectable?: boolean;
  sortOrder?: number;
  voiceCount?: number;
  minWebVersion?: string | null;
  minApiVersion?: string | null;
  selectionKeys?: Array<string> | null;
  diagnostics?: Array<PCode_Application_Contracts_Dto_VoiceReminderPluginDiagnosticDto> | null;
};


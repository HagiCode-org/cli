/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VoiceReminderPluginDiagnosticDto } from './PCode_Application_Contracts_Dto_VoiceReminderPluginDiagnosticDto';
import type { PCode_Application_Contracts_Dto_VoiceReminderPluginPackageDto } from './PCode_Application_Contracts_Dto_VoiceReminderPluginPackageDto';
import type { PCode_Application_Contracts_Dto_VoiceReminderVoiceDto } from './PCode_Application_Contracts_Dto_VoiceReminderVoiceDto';
export type PCode_Application_Contracts_Dto_VoiceReminderCatalogDto = {
  catalogVersion?: string | null;
  generatedAtUtc?: string;
  plugins?: Array<PCode_Application_Contracts_Dto_VoiceReminderPluginPackageDto> | null;
  disabledPlugins?: Array<PCode_Application_Contracts_Dto_VoiceReminderPluginPackageDto> | null;
  voices?: Array<PCode_Application_Contracts_Dto_VoiceReminderVoiceDto> | null;
  diagnostics?: Array<PCode_Application_Contracts_Dto_VoiceReminderPluginDiagnosticDto> | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroAvatarPluginDiagnosticDto } from './PCode_Application_Contracts_Dto_HeroAvatarPluginDiagnosticDto';
export type PCode_Application_Contracts_Dto_HeroAvatarPluginPackageDto = {
  catalogKey?: string | null;
  pluginId?: string | null;
  displayName?: string | null;
  version?: string | null;
  description?: string | null;
  sourceKind?: string | null;
  status?: string | null;
  isBundled?: boolean;
  isSelectable?: boolean;
  sortOrder?: number;
  entryCount?: number;
  stylePackKeys?: Array<string> | null;
  diagnostics?: Array<PCode_Application_Contracts_Dto_HeroAvatarPluginDiagnosticDto> | null;
};


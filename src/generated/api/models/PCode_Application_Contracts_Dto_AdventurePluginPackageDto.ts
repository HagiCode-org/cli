/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AdventurePluginDiagnosticDto } from './PCode_Application_Contracts_Dto_AdventurePluginDiagnosticDto';
export type PCode_Application_Contracts_Dto_AdventurePluginPackageDto = {
  pluginId?: string | null;
  displayName?: string | null;
  version?: string | null;
  description?: string | null;
  sourceKind?: string | null;
  status?: string | null;
  isBundled?: boolean;
  isSelectable?: boolean;
  defaultLocale?: string | null;
  supportedLocales?: Array<string> | null;
  localeBasePath?: string | null;
  assetBasePath?: string | null;
  previewAssetPath?: string | null;
  providesStyles?: Array<string> | null;
  extendsStyles?: Array<string> | null;
  capabilities?: Array<string> | null;
  diagnostics?: Array<PCode_Application_Contracts_Dto_AdventurePluginDiagnosticDto> | null;
};


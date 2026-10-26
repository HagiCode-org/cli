/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_PresetTaskPluginDiagnosticDto } from './PCode_Web_Controllers_PresetTaskPluginDiagnosticDto';
/**
 * Not-found body for an unknown or disabled preset task. Diagnostics come from the disabled package, when there is one.
 */
export type PCode_Web_Controllers_PresetTaskUnavailableResponseDto = {
  error?: string | null;
  diagnostics?: Array<PCode_Web_Controllers_PresetTaskPluginDiagnosticDto> | null;
};


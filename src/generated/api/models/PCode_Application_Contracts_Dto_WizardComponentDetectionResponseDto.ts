/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_WizardComponentStatusDto } from './PCode_Application_Contracts_Dto_WizardComponentStatusDto';
/**
 * Aggregated response for wizard component detection, containing individual component
 * statuses and a step-level summary.
 */
export type PCode_Application_Contracts_Dto_WizardComponentDetectionResponseDto = {
  /**
   * Individual component detection results.
   */
  components: Array<PCode_Application_Contracts_Dto_WizardComponentStatusDto>;
  /**
   * Whether all prerequisite components are installed and compatible.
   */
  stepComplete?: boolean;
  /**
   * Summary failure reasons when StepComplete is false.
   */
  failureReasons?: Array<string> | null;
};


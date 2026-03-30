/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus } from './PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus';
/**
 * Structured managed install result for a skill gallery action.
 */
export type PCode_Application_Contracts_Dto_InstallSkillResultDto = {
  skillId?: string | null;
  source?: string | null;
  skillSlug?: string | null;
  /**
   * Lower-cased normalized key for the managed install target.
   */
  normalizedSkillKey?: string | null;
  /**
   * Normalized repository-backed skill reference passed to `npx skills add`.
   */
  installReference?: string | null;
  /**
   * Preview of the backend-managed command. The backend always enforces `-g -y`
   * so installs stay non-interactive for web-triggered and automation-safe flows.
   */
  commandPreview?: string | null;
  version?: string | null;
  status?: PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus;
  userMessage?: string | null;
  diagnosticMessage?: string | null;
  occurredAt?: string;
};


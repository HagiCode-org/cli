/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus } from './PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus';
/**
 * Structured result for a managed global-skill uninstall request.
 */
export type PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto = {
  skillName?: string | null;
  status?: PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus;
  userMessage?: string | null;
  diagnosticMessage?: string | null;
  occurredAt?: string;
};


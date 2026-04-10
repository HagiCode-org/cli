/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ProposalOptimizationDiagnosticDto } from './PCode_Application_Contracts_Dto_ProposalOptimizationDiagnosticDto';
export type PCode_Application_Contracts_Dto_ProposalOptimizationBundleSummaryDto = {
  requestFingerprint?: string | null;
  generatedAtUtc?: string;
  source?: string | null;
  appliedTitle?: string | null;
  appliedProposalName?: string | null;
  proposalDraftAvailable?: boolean;
  keywordUpdateStatus?: string | null;
  keywordCount?: number;
  dungeonSettingsStatus?: string | null;
  appliedTitleMode?: string | null;
  isValid?: boolean;
  diagnostics?: Array<PCode_Application_Contracts_Dto_ProposalOptimizationDiagnosticDto> | null;
  optimizedTitleCandidate?: string | null;
  proposalDraftPreview?: string | null;
  artifactPath?: string | null;
};


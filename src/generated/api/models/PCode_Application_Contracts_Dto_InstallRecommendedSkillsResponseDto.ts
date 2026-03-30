/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_InstallSkillResultDto } from './PCode_Application_Contracts_Dto_InstallSkillResultDto';
import type { PCode_Application_Contracts_Dto_RecommendationBatchInstallSummaryDto } from './PCode_Application_Contracts_Dto_RecommendationBatchInstallSummaryDto';
export type PCode_Application_Contracts_Dto_InstallRecommendedSkillsResponseDto = {
  generatedAtUtc?: string;
  items?: Array<PCode_Application_Contracts_Dto_InstallSkillResultDto> | null;
  summary?: PCode_Application_Contracts_Dto_RecommendationBatchInstallSummaryDto;
  warnings?: Array<string> | null;
};


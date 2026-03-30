/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroBattleReportHeroDto } from './PCode_Application_Contracts_Dto_HeroBattleReportHeroDto';
import type { PCode_Application_Contracts_Dto_HeroBattleReportSummaryDto } from './PCode_Application_Contracts_Dto_HeroBattleReportSummaryDto';
export type PCode_Application_Contracts_Dto_HeroBattleReportDto = {
  reportDate?: string | null;
  generatedAtUtc?: string;
  summary?: PCode_Application_Contracts_Dto_HeroBattleReportSummaryDto;
  heroes?: Array<PCode_Application_Contracts_Dto_HeroBattleReportHeroDto> | null;
};


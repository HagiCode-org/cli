/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HagipowerHeroHistoryPointDto } from './PCode_Application_Contracts_Dto_HagipowerHeroHistoryPointDto';
import type { PCode_Application_Contracts_Dto_HagipowerHeroSummaryDto } from './PCode_Application_Contracts_Dto_HagipowerHeroSummaryDto';
import type { PCode_Application_Contracts_Dto_HagipowerPublicHistoryPointDto } from './PCode_Application_Contracts_Dto_HagipowerPublicHistoryPointDto';
import type { PCode_Application_Contracts_Dto_HagipowerStatisticsMetadataDto } from './PCode_Application_Contracts_Dto_HagipowerStatisticsMetadataDto';
import type { PCode_Application_Contracts_Dto_HagipowerStatisticsSummaryDto } from './PCode_Application_Contracts_Dto_HagipowerStatisticsSummaryDto';
export type PCode_Application_Contracts_Dto_HagipowerStatisticsReportDto = {
  range?: string | null;
  metadata?: PCode_Application_Contracts_Dto_HagipowerStatisticsMetadataDto;
  summary?: PCode_Application_Contracts_Dto_HagipowerStatisticsSummaryDto;
  publicSeries?: Array<PCode_Application_Contracts_Dto_HagipowerPublicHistoryPointDto> | null;
  heroSeries?: Array<PCode_Application_Contracts_Dto_HagipowerHeroHistoryPointDto> | null;
  heroSummaries?: Array<PCode_Application_Contracts_Dto_HagipowerHeroSummaryDto> | null;
};


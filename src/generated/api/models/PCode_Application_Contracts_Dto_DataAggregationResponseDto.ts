/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AggregationMetadataDto } from './PCode_Application_Contracts_Dto_AggregationMetadataDto';
import type { PCode_Application_Contracts_Dto_ProjectAggregationDto } from './PCode_Application_Contracts_Dto_ProjectAggregationDto';
/**
 * Main response DTO for data aggregation API
 */
export type PCode_Application_Contracts_Dto_DataAggregationResponseDto = {
  /**
   * List of aggregated projects
   */
  projects?: Array<PCode_Application_Contracts_Dto_ProjectAggregationDto> | null;
  metadata?: PCode_Application_Contracts_Dto_AggregationMetadataDto;
};


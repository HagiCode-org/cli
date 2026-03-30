/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_ChannelsDto } from './PCode_Application_Contracts_Dto_ChannelsDto';
import type { PCode_Application_Contracts_Dto_VersionIndexEntryDto } from './PCode_Application_Contracts_Dto_VersionIndexEntryDto';
/**
 * Complete version index with channels support
 */
export type PCode_Application_Contracts_Dto_VersionIndexDto = {
  /**
   * ISO 8601 timestamp when the index was last updated
   */
  updatedAt?: string | null;
  /**
   * Array of all version entries, ordered from newest to oldest
   */
  versions?: Array<PCode_Application_Contracts_Dto_VersionIndexEntryDto> | null;
  channels?: PCode_Application_Contracts_Dto_ChannelsDto;
};


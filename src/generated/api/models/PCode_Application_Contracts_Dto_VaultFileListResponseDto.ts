/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_VaultFileEntryDto } from './PCode_Application_Contracts_Dto_VaultFileEntryDto';
export type PCode_Application_Contracts_Dto_VaultFileListResponseDto = {
  vaultId?: string | null;
  vaultName?: string | null;
  physicalPath?: string | null;
  status?: string | null;
  errorCode?: string | null;
  message?: string | null;
  isTruncated?: boolean;
  totalFileCount?: number;
  items?: Array<PCode_Application_Contracts_Dto_VaultFileEntryDto> | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_FrontendConfigMigrationMetadataDto } from './PCode_Application_Contracts_Dto_FrontendConfigMigrationMetadataDto';
import type { PCode_Application_Contracts_Dto_FrontendConfigSnapshotDto } from './PCode_Application_Contracts_Dto_FrontendConfigSnapshotDto';
export type PCode_Application_Contracts_Dto_FrontendConfigResponseDto = {
  schemaVersion?: string | null;
  source?: string | null;
  migrationState?: string | null;
  snapshot?: PCode_Application_Contracts_Dto_FrontendConfigSnapshotDto;
  migration?: PCode_Application_Contracts_Dto_FrontendConfigMigrationMetadataDto;
};


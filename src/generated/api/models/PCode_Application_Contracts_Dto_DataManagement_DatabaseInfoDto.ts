/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Database information DTO for API responses
 */
export type PCode_Application_Contracts_Dto_DataManagement_DatabaseInfoDto = {
  /**
   * The type of database being used (e.g., "SQLite" or "PostgreSQL")
   */
  databaseType?: string | null;
  /**
   * The size of the database file in bytes
   */
  sizeBytes?: number;
  /**
   * Human-readable formatted database size (e.g., "10.5 MB")
   */
  formattedSize?: string | null;
  /**
   * The number of archived sessions in the database
   */
  archivedSessionCount?: number;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * DTO representing an OpenSpec change folder
 */
export type PCode_Application_Contracts_Dto_OpenSpecChangeFolderDto = {
  /**
   * The folder name (proposal name)
   */
  name: string | null;
  /**
   * When the folder was created (derived from file system)
   */
  createdAt?: string | null;
  /**
   * Whether this folder has been archived
   */
  isArchived?: boolean;
  /**
   * The number of files in the folder (excluding subdirectories).
   * Null if the folder cannot be accessed.
   */
  fileCount?: number | null;
};


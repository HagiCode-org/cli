/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Summary statistics for validation
 */
export type PCode_Application_Contracts_Dto_DataManagement_ValidationSummaryDto = {
  /**
   * Number of projects in import data
   */
  projectCount?: number;
  /**
   * Number of sessions in import data
   */
  sessionCount?: number;
  /**
   * Number of projects with duplicate IDs
   */
  duplicateProjectCount?: number;
  /**
   * Number of orphaned sessions (referencing non-existent projects)
   */
  orphanedSessionCount?: number;
};


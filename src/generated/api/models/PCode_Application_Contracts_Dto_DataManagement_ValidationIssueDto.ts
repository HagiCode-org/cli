/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Represents a validation issue (error or warning)
 */
export type PCode_Application_Contracts_Dto_DataManagement_ValidationIssueDto = {
  /**
   * Error/warning code (e.g., "DUPLICATE_PROJECT_ID", "ORPHANED_SESSION")
   */
  code?: string | null;
  /**
   * Human-readable message
   */
  message?: string | null;
  /**
   * Severity level (error, warning)
   */
  severity?: string | null;
  /**
   * Entity ID this issue relates to (optional)
   */
  entityId?: string | null;
};


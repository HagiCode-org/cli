/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Represents a conflict detected during import
 */
export type PCode_Application_Contracts_Dto_DataManagement_ConflictDto = {
  /**
   * Type of conflict (e.g., "DuplicateProject", "OrphanedSession")
   */
  type?: string | null;
  /**
   * ID of the entity involved in the conflict
   */
  entityId?: string | null;
  /**
   * Human-readable description of the conflict
   */
  description?: string | null;
  /**
   * How the conflict was resolved (skip, overwrite, rename)
   */
  resolution?: string | null;
};


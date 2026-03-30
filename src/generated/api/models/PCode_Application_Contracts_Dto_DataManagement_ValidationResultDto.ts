/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_DataManagement_ConflictDto } from './PCode_Application_Contracts_Dto_DataManagement_ConflictDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ValidationIssueDto } from './PCode_Application_Contracts_Dto_DataManagement_ValidationIssueDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ValidationSummaryDto } from './PCode_Application_Contracts_Dto_DataManagement_ValidationSummaryDto';
/**
 * Result of validating import data
 */
export type PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto = {
  /**
   * Whether the data is valid for import
   */
  isValid?: boolean;
  /**
   * Warnings generated during validation
   */
  warnings?: Array<PCode_Application_Contracts_Dto_DataManagement_ValidationIssueDto> | null;
  /**
   * Errors generated during validation
   */
  errors?: Array<PCode_Application_Contracts_Dto_DataManagement_ValidationIssueDto> | null;
  /**
   * Conflicts detected that need resolution
   */
  conflicts?: Array<PCode_Application_Contracts_Dto_DataManagement_ConflictDto> | null;
  summary?: PCode_Application_Contracts_Dto_DataManagement_ValidationSummaryDto;
};


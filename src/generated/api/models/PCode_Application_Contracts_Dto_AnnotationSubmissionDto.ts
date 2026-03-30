/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_FileAnnotationDto } from './PCode_Application_Contracts_Dto_FileAnnotationDto';
/**
 * Request DTO for submitting annotations across multiple files
 */
export type PCode_Application_Contracts_Dto_AnnotationSubmissionDto = {
  /**
   * Session ID for the proposal
   */
  sessionId: string;
  /**
   * All files with annotations
   */
  files: Array<PCode_Application_Contracts_Dto_FileAnnotationDto>;
  /**
   * Total count of all annotations across all files
   */
  totalAnnotations: number;
  /**
   * Submission timestamp
   */
  submittedAt: string;
};


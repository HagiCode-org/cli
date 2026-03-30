/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_BlockAnnotationDto } from './PCode_Application_Contracts_Dto_BlockAnnotationDto';
/**
 * Annotations for a single file
 */
export type PCode_Application_Contracts_Dto_FileAnnotationDto = {
  /**
   * File name (e.g., "proposal.md")
   */
  fileName: string;
  /**
   * Full file path relative to openspec directory
   */
  filePath: string;
  /**
   * Block-specific annotations (unified for text, code, diagrams)
   */
  blockAnnotations?: Array<PCode_Application_Contracts_Dto_BlockAnnotationDto> | null;
  /**
   * File-level annotation text
   */
  fileAnnotation?: string | null;
};


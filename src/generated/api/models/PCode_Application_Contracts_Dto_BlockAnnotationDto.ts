/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Annotation for a content block (text paragraph, code block, diagram, etc.)
 */
export type PCode_Application_Contracts_Dto_BlockAnnotationDto = {
  /**
   * Line where the block starts
   */
  startLineNumber: number;
  /**
   * Line where the block ends
   */
  endLineNumber: number;
  /**
   * Original block content (exact text from the file)
   */
  originalContent: string;
  /**
   * Type of block (text, code, diagram, etc.)
   */
  blockType: string;
  /**
   * User's annotation content
   */
  annotationText: string;
  /**
   * When annotation was created
   */
  timestamp: string;
  /**
   * Unique annotation identifier
   */
  id: string;
};


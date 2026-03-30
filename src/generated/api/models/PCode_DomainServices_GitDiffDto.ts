/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_DomainServices_DiffHunkDto } from './PCode_DomainServices_DiffHunkDto';
export type PCode_DomainServices_GitDiffDto = {
  filePath?: string | null;
  isBinary?: boolean;
  isDeleted?: boolean;
  isNew?: boolean;
  hunks?: Array<PCode_DomainServices_DiffHunkDto> | null;
};


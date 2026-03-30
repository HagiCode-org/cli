/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_DomainServices_DiffLineDto } from './PCode_DomainServices_DiffLineDto';
export type PCode_DomainServices_DiffHunkDto = {
  oldStart?: number;
  oldCount?: number;
  newStart?: number;
  newCount?: number;
  header?: string | null;
  lines?: Array<PCode_DomainServices_DiffLineDto> | null;
};


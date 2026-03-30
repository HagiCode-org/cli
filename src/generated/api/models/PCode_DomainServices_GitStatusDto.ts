/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_DomainServices_GitFileStatusDto } from './PCode_DomainServices_GitFileStatusDto';
export type PCode_DomainServices_GitStatusDto = {
  branch?: string | null;
  files?: Array<PCode_DomainServices_GitFileStatusDto> | null;
  unstagedCount?: number;
  stagedCount?: number;
};


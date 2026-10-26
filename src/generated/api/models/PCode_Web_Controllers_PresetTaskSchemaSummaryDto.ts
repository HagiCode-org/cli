/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * One row of the HagiTask schema list: the task identity and the number of targets, commands and parameters.
 */
export type PCode_Web_Controllers_PresetTaskSchemaSummaryDto = {
  id?: string | null;
  groupId?: string | null;
  sourceKind?: string | null;
  version?: string | null;
  title?: string | null;
  description?: string | null;
  targetCount?: number;
  commandCount?: number;
  parameterCount?: number;
};


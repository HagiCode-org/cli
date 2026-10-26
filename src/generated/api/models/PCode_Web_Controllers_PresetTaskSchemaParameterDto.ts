/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_PresetTaskFieldOptionDto } from './PCode_Web_Controllers_PresetTaskFieldOptionDto';
import type { PCode_Web_Controllers_PresetTaskSchemaAliasDto } from './PCode_Web_Controllers_PresetTaskSchemaAliasDto';
export type PCode_Web_Controllers_PresetTaskSchemaParameterDto = {
  key?: string | null;
  /**
   * `input` when the client types the value, `derived` when the client computes it.
   */
  origin?: string | null;
  /**
   * Producer of a derived value, for example `frontend-computed`. Null for typed inputs.
   */
  producer?: string | null;
  /**
   * Value kind: `boolean`, `string`, `string-list`, `url-list`, `command` or `value`.
   */
  valueType?: string | null;
  required?: boolean;
  label?: string | null;
  hint?: string | null;
  options?: Array<PCode_Web_Controllers_PresetTaskFieldOptionDto> | null;
  aliases?: Array<PCode_Web_Controllers_PresetTaskSchemaAliasDto> | null;
};


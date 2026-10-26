/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_PresetTaskRequirementDto } from './PCode_Web_Controllers_PresetTaskRequirementDto';
import type { PCode_Web_Controllers_PresetTaskSchemaCommandsDto } from './PCode_Web_Controllers_PresetTaskSchemaCommandsDto';
import type { PCode_Web_Controllers_PresetTaskSchemaParameterDto } from './PCode_Web_Controllers_PresetTaskSchemaParameterDto';
import type { PCode_Web_Controllers_PresetTaskSchemaRequestDto } from './PCode_Web_Controllers_PresetTaskSchemaRequestDto';
import type { PCode_Web_Controllers_PresetTaskSchemaScenesDto } from './PCode_Web_Controllers_PresetTaskSchemaScenesDto';
import type { PCode_Web_Controllers_PresetTaskSchemaScopeDto } from './PCode_Web_Controllers_PresetTaskSchemaScopeDto';
import type { System_Text_Json_Nodes_JsonNode } from './System_Text_Json_Nodes_JsonNode';
/**
 * Everything a client needs to build a creation request for one HagiTask without reading the package files.
 */
export type PCode_Web_Controllers_PresetTaskCreationSchemaDto = {
  id?: string | null;
  version?: string | null;
  locale?: string | null;
  title?: string | null;
  description?: string | null;
  scope?: PCode_Web_Controllers_PresetTaskSchemaScopeDto;
  commands?: PCode_Web_Controllers_PresetTaskSchemaCommandsDto;
  parameters?: Array<PCode_Web_Controllers_PresetTaskSchemaParameterDto> | null;
  requirements?: Array<PCode_Web_Controllers_PresetTaskRequirementDto> | null;
  scenes?: PCode_Web_Controllers_PresetTaskSchemaScenesDto;
  request?: PCode_Web_Controllers_PresetTaskSchemaRequestDto;
  /**
   * JSON Schema (2020-12) of the `presetTaskInput` object. Generated per task, so it is an open object in the contract.
   */
  inputSchema?: Record<string, System_Text_Json_Nodes_JsonNode> | null;
  /**
   * Example creation request body. Required inputs carry placeholder values.
   */
  example?: Record<string, System_Text_Json_Nodes_JsonNode> | null;
};


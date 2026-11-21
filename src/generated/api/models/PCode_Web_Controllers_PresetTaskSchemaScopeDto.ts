/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_PresetTaskSchemaTargetDto } from './PCode_Web_Controllers_PresetTaskSchemaTargetDto';
import type { System_Text_Json_Nodes_JsonNode } from './System_Text_Json_Nodes_JsonNode';
export type PCode_Web_Controllers_PresetTaskSchemaScopeDto = {
  defaultTargetType?: string | null;
  targets?: Array<PCode_Web_Controllers_PresetTaskSchemaTargetDto> | null;
  /**
   * JSON Schema (2020-12) of the request `scope` object for this task. Hand-maintained; mirrors the proto Struct.
   */
  jsonSchema?: Record<string, System_Text_Json_Nodes_JsonNode> | null;
};


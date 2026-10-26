/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Web_Controllers_PresetTaskSchemaTargetDto = {
  id?: string | null;
  kind?: string | null;
  selectionMode?: string | null;
  required?: boolean;
  allowedAccessTypes?: Array<string> | null;
  scopeSource?: string | null;
  /**
   * Key of the target list under `presetTaskInput.targets`.
   */
  requestKey?: string | null;
  /**
   * Key of the select-all scope under `presetTaskInput.targetScopes`. Null when the selection is not a repository list.
   */
  scopeRequestKey?: string | null;
};


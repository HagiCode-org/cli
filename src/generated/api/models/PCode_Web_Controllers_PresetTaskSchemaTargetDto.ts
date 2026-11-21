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
   * JSON path of this selection in the request `scope`, for example `scope.repositories.<id>`, `scope.vaults.reference`
   * or `scope.projects`.
   */
  requestKey?: string | null;
};


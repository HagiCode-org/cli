/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The scope of a HagiTask creation request: repositories keyed by the preset's repository selection id, vault roles and
 * projects. Hand-maintained to match the `HagiTaskScope` proto message (sessions.proto); the backend resolves it.
 */
export type PCode_Application_Contracts_Sessions_HagiTaskScopeDto = {
  /**
   * Keyed by the repository selection id of the preset task (for example `targetRepositories`).
   */
  repositories?: Record<string, PCode_Application_Contracts_Sessions_HagiTaskRepositoryScopeDto> | null;
  vaults?: PCode_Application_Contracts_Sessions_HagiTaskVaultScopeDto;
  projects?: Array<PCode_Application_Contracts_Sessions_HagiTaskProjectScopeDto> | null;
};

/**
 * One repository selection. `explicit` lists items; `all` selects every repository of the owner project with `accessType`.
 */
export type PCode_Application_Contracts_Sessions_HagiTaskRepositoryScopeDto = {
  /**
   * `explicit` or `all`.
   */
  mode?: string | null;
  items?: Array<PCode_Application_Contracts_Sessions_HagiTaskRepositoryScopeItemDto> | null;
  /**
   * Access of an `all` selection: `read` or `write`.
   */
  accessType?: string | null;
};

export type PCode_Application_Contracts_Sessions_HagiTaskRepositoryScopeItemDto = {
  path?: string | null;
  accessType?: string | null;
};

export type PCode_Application_Contracts_Sessions_HagiTaskVaultScopeDto = {
  output?: string | null;
  reference?: Array<string> | null;
  editable?: Array<string> | null;
};

export type PCode_Application_Contracts_Sessions_HagiTaskProjectScopeDto = {
  projectId?: string;
  accessType?: string | null;
  /**
   * Optional per-project repository selection (cross-project-repository-scope). The CLI never sets these.
   */
  repositories?: Array<Record<string, unknown>> | null;
  repositoryScope?: Record<string, unknown> | null;
};

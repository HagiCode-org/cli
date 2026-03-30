/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * DTO representing a single Git repository
 */
export type PCode_Application_Contracts_GitRepoDto = {
  /**
   * Repository name (directory name)
   */
  name?: string | null;
  /**
   * Full path to the repository
   */
  path?: string | null;
  /**
   * Relative path from the scan root
   */
  relativePath?: string | null;
  /**
   * Indicates whether this repository is a MonoSpecs repository
   */
  isMonoSpecs?: boolean;
};


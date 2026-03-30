/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Models_SubRepoInfoDto } from './PCode_Models_SubRepoInfoDto';
export type PCode_Application_Contracts_Dto_ProjectDto = {
  id?: string;
  name: string;
  path: string;
  description?: string | null;
  creationTime?: string;
  lastModificationTime?: string | null;
  /**
   * Indicates whether this project is a MonoSpecs repository.
   * This is dynamically determined by checking for monospecs.yaml file.
   */
  isMonoSpecs?: boolean;
  /**
   * The version of the MonoSpecs configuration, if this is a MonoSpecs repository.
   */
  monoSpecsVersion?: string | null;
  /**
   * The repository directory path from MonoSpecs configuration, if applicable.
   * This is the full path to the repos directory.
   */
  monoSpecsRepoDirectory?: string | null;
  /**
   * Indicates whether Git commits are automatically performed after archiving proposals.
   * This is configured in monospecs.yaml via the commit_when_archive field.
   */
  monoSpecsCommitWhenArchive?: boolean | null;
  /**
   * The list of sub-repositories in a MonoSpecs repository.
   * This is populated when IsMonoSpecs is true.
   */
  subRepositories?: Array<PCode_Models_SubRepoInfoDto> | null;
};


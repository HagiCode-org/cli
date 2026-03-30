/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request DTO for scanning Git repositories
 */
export type PCode_Application_Contracts_ScanGitReposRequestDto = {
  /**
   * Root path to start scanning
   */
  rootPath?: string | null;
  /**
   * Maximum depth to scan (1 = root directory only, default 3)
   */
  maxDepth?: number;
  /**
   * Whether to exclude hidden directories (default true)
   */
  excludeHidden?: boolean;
  /**
   * Maximum number of folders to scan per depth level (default 1000)
   */
  maxFoldersPerLevel?: number;
  /**
   * Optional patterns to exclude (e.g., "node_modules", ".venv")
   */
  excludePatterns?: Array<string> | null;
};


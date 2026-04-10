/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_BranchValidationResponseDto } from '../models/PCode_Application_Contracts_Dto_BranchValidationResponseDto';
import type { PCode_Application_Contracts_Dto_CreateProjectDto } from '../models/PCode_Application_Contracts_Dto_CreateProjectDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementDto } from '../models/PCode_Application_Contracts_Dto_MonoSpecsManagementDto';
import type { PCode_Application_Contracts_Dto_PathValidationResponseDto } from '../models/PCode_Application_Contracts_Dto_PathValidationResponseDto';
import type { PCode_Application_Contracts_Dto_ProjectDesignDocumentDto } from '../models/PCode_Application_Contracts_Dto_ProjectDesignDocumentDto';
import type { PCode_Application_Contracts_Dto_ProjectDesignSiteDocumentDto } from '../models/PCode_Application_Contracts_Dto_ProjectDesignSiteDocumentDto';
import type { PCode_Application_Contracts_Dto_ProjectDesignSiteIndexDto } from '../models/PCode_Application_Contracts_Dto_ProjectDesignSiteIndexDto';
import type { PCode_Application_Contracts_Dto_ProjectDto } from '../models/PCode_Application_Contracts_Dto_ProjectDto';
import type { PCode_Application_Contracts_Dto_SaveProjectDesignDocumentResultDto } from '../models/PCode_Application_Contracts_Dto_SaveProjectDesignDocumentResultDto';
import type { PCode_Application_Contracts_Dto_UpdateMonoSpecsManagementRequestDto } from '../models/PCode_Application_Contracts_Dto_UpdateMonoSpecsManagementRequestDto';
import type { PCode_Application_Contracts_Dto_UpdateProjectDesignDocumentRequestDto } from '../models/PCode_Application_Contracts_Dto_UpdateProjectDesignDocumentRequestDto';
import type { PCode_Application_Contracts_Dto_UpdateProjectDto } from '../models/PCode_Application_Contracts_Dto_UpdateProjectDto';
import type { PCode_Application_Contracts_Dto_ValidateMonoSpecsRequestDto } from '../models/PCode_Application_Contracts_Dto_ValidateMonoSpecsRequestDto';
import type { PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto } from '../models/PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto';
import type { PCode_Application_Contracts_Dto_VsCodeLaunchResponseDto } from '../models/PCode_Application_Contracts_Dto_VsCodeLaunchResponseDto';
import type { PCode_Application_Contracts_ScanGitReposRequestDto } from '../models/PCode_Application_Contracts_ScanGitReposRequestDto';
import type { PCode_Application_Contracts_ScanGitReposResponseDto } from '../models/PCode_Application_Contracts_ScanGitReposResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProjectService {
  /**
   * @returns PCode_Application_Contracts_Dto_ProjectDto OK
   * @throws ApiError
   */
  public static postApiProject({
    requestBody,
  }: {
    requestBody?: PCode_Application_Contracts_Dto_CreateProjectDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProjectDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Project',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_ProjectDto OK
   * @throws ApiError
   */
  public static postApiProjectDemo(): CancelablePromise<PCode_Application_Contracts_Dto_ProjectDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Project/demo',
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_ProjectDto OK
   * @throws ApiError
   */
  public static putApiProject({
    id,
    requestBody,
  }: {
    id: string,
    requestBody?: PCode_Application_Contracts_Dto_UpdateProjectDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProjectDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Project/{id}',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static deleteApiProject({
    id,
  }: {
    id: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Project/{id}',
      path: {
        'id': id,
      },
    });
  }
  /**
   * Opens the project workspace in VS Code with optional sub-path support for MonoSpec repositories
   * This endpoint launches VS Code as an independent process for the project workspace.
   * Supports Windows, macOS, and Linux platforms.
   * For MonoSpec repositories, the subPath parameter allows opening a specific sub-repository.
   * When subPath is null or empty, the main repository (project root) is opened.
   * @returns PCode_Application_Contracts_Dto_VsCodeLaunchResponseDto VS Code launched successfully
   * @throws ApiError
   */
  public static postApiProjectOpenInVscode({
    id,
    subPath,
  }: {
    /**
     * The unique identifier of the project
     */
    id: string,
    /**
     * Optional relative path to sub-repository (e.g., "repos/web"). When null or empty, opens the main repository.
     */
    subPath?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_VsCodeLaunchResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Project/{id}/open-in-vscode',
      path: {
        'id': id,
      },
      query: {
        'subPath': subPath,
      },
      errors: {
        400: `Invalid project path or sub-path`,
        403: `Sub-path is outside project directory`,
        404: `Project not found`,
        500: `Failed to launch VS Code`,
      },
    });
  }
  /**
   * Gets the structured MonoSpecs management document for the target project.
   * @returns PCode_Application_Contracts_Dto_MonoSpecsManagementDto OK
   * @throws ApiError
   */
  public static getApiProjectMonospecsManagement({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/{id}/monospecs/management',
      path: {
        'id': id,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * Saves the complete MonoSpecs management document for the target project.
   * @returns PCode_Application_Contracts_Dto_MonoSpecsManagementDto OK
   * @throws ApiError
   */
  public static putApiProjectMonospecsManagement({
    id,
    requestBody,
  }: {
    id: string,
    requestBody?: PCode_Application_Contracts_Dto_UpdateMonoSpecsManagementRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Project/{id}/monospecs/management',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * Initializes the minimal MonoSpecs configuration for the target project.
   * @returns PCode_Application_Contracts_Dto_MonoSpecsManagementDto OK
   * @throws ApiError
   */
  public static postApiProjectMonospecsInitialize({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_MonoSpecsManagementDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Project/{id}/monospecs/initialize',
      path: {
        'id': id,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * Gets the DESIGN.md document for the project root or a specific repository path.
   * @returns PCode_Application_Contracts_Dto_ProjectDesignDocumentDto OK
   * @throws ApiError
   */
  public static getApiProjectDesignMd({
    id,
    repositoryPath,
  }: {
    id: string,
    repositoryPath?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProjectDesignDocumentDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/{id}/design-md',
      path: {
        'id': id,
      },
      query: {
        'repositoryPath': repositoryPath,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * Saves the DESIGN.md document for the project root or a specific repository path.
   * @returns PCode_Application_Contracts_Dto_SaveProjectDesignDocumentResultDto OK
   * @throws ApiError
   */
  public static putApiProjectDesignMd({
    id,
    requestBody,
  }: {
    id: string,
    requestBody?: PCode_Application_Contracts_Dto_UpdateProjectDesignDocumentRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SaveProjectDesignDocumentResultDto> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Project/{id}/design-md',
      path: {
        'id': id,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        409: `Conflict`,
        500: `Internal Server Error`,
      },
    });
  }
  /**
   * Gets the published design site catalog through the project-scoped backend proxy.
   * @returns PCode_Application_Contracts_Dto_ProjectDesignSiteIndexDto OK
   * @throws ApiError
   */
  public static getApiProjectDesignMdSiteIndex({
    id,
  }: {
    id: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProjectDesignSiteIndexDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/{id}/design-md/site-index',
      path: {
        'id': id,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Gets a cached design site preview image through the project-scoped backend proxy.
   * @returns any OK
   * @throws ApiError
   */
  public static getApiProjectDesignMdSiteIndexPreview({
    id,
    slug,
    theme = 'light',
  }: {
    id: string,
    slug: string,
    theme?: string,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/{id}/design-md/site-index/{slug}/preview',
      path: {
        'id': id,
        'slug': slug,
      },
      query: {
        'theme': theme,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Gets the canonical DESIGN.md document for a published design site slug.
   * @returns PCode_Application_Contracts_Dto_ProjectDesignSiteDocumentDto OK
   * @throws ApiError
   */
  public static getApiProjectDesignMdSiteIndex1({
    id,
    slug,
  }: {
    id: string,
    slug: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProjectDesignSiteDocumentDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/{id}/design-md/site-index/{slug}',
      path: {
        'id': id,
        'slug': slug,
      },
      errors: {
        400: `Bad Request`,
        404: `Not Found`,
        502: `Bad Gateway`,
        504: `Gateway Timeout`,
      },
    });
  }
  /**
   * Validates a branch name for a project or selected sub-repository.
   * @returns PCode_Application_Contracts_Dto_BranchValidationResponseDto Branch validation completed successfully
   * @throws ApiError
   */
  public static getApiProjectBranchesValidate({
    id,
    branchName,
    repositoryPath,
  }: {
    id: string,
    branchName?: string,
    repositoryPath?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_BranchValidationResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/{id}/branches/validate',
      path: {
        'id': id,
      },
      query: {
        'branchName': branchName,
        'repositoryPath': repositoryPath,
      },
      errors: {
        400: `Branch name is required`,
        404: `Project not found`,
      },
    });
  }
  /**
   * Validates a project path for real-time feedback during project creation
   * @returns PCode_Application_Contracts_Dto_PathValidationResponseDto Path validation completed successfully
   * @throws ApiError
   */
  public static getApiProjectValidatePath({
    path,
  }: {
    /**
     * The file system path to validate
     */
    path?: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_PathValidationResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Project/validate-path',
      query: {
        'path': path,
      },
      errors: {
        400: `Path parameter is missing or invalid`,
        500: `Internal server error during validation`,
      },
    });
  }
  /**
   * Scans a directory for Git repositories up to a specified depth
   * This endpoint scans a directory for Git repositories by looking for .git folders.
   * Scans up to the specified depth (default 3 levels) and excludes common directories
   * like node_modules, venv, etc. Hidden directories can be optionally excluded.
   * @returns PCode_Application_Contracts_ScanGitReposResponseDto Scan completed successfully
   * @throws ApiError
   */
  public static postApiProjectScanGitRepos({
    requestBody,
  }: {
    /**
     * Scan request with root path and options
     */
    requestBody?: PCode_Application_Contracts_ScanGitReposRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_ScanGitReposResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Project/scan-git-repos',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request parameters`,
        500: `Internal server error during scan`,
      },
    });
  }
  /**
   * Validates MonoSpecs configuration at a given project path
   * This endpoint validates the monospecs.yaml file at the specified path.
   * Checks for YAML syntax errors, invalid paths, and directory existence.
   * @returns PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto Validation completed successfully
   * @throws ApiError
   */
  public static postApiProjectValidateMonospecs({
    requestBody,
  }: {
    /**
     * Validation request with project path
     */
    requestBody?: PCode_Application_Contracts_Dto_ValidateMonoSpecsRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Project/validate-monospecs',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request parameters`,
        500: `Internal server error`,
      },
    });
  }
}

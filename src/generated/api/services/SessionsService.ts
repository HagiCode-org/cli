/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionDto } from '../models/PCode_Application_Contracts_Dto_AnnotationSubmissionDto';
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto } from '../models/PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto';
import type { PCode_Application_Contracts_Dto_ArchiveSessionRequestDto } from '../models/PCode_Application_Contracts_Dto_ArchiveSessionRequestDto';
import type { PCode_Application_Contracts_Dto_CancelPendingMessageDto } from '../models/PCode_Application_Contracts_Dto_CancelPendingMessageDto';
import type { PCode_Application_Contracts_Dto_CessionIdResponseDto } from '../models/PCode_Application_Contracts_Dto_CessionIdResponseDto';
import type { PCode_Application_Contracts_Dto_CorrectProposalNameRequestDto } from '../models/PCode_Application_Contracts_Dto_CorrectProposalNameRequestDto';
import type { PCode_Application_Contracts_Dto_CorrectProposalNameResponseDto } from '../models/PCode_Application_Contracts_Dto_CorrectProposalNameResponseDto';
import type { PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto } from '../models/PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto';
import type { PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto } from '../models/PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto';
import type { PCode_Application_Contracts_Dto_ExecuteProposalRequestDto } from '../models/PCode_Application_Contracts_Dto_ExecuteProposalRequestDto';
import type { PCode_Application_Contracts_Dto_GenerateProposalRequestDto } from '../models/PCode_Application_Contracts_Dto_GenerateProposalRequestDto';
import type { PCode_Application_Contracts_Dto_OptimizedTitleResponseDto } from '../models/PCode_Application_Contracts_Dto_OptimizedTitleResponseDto';
import type { PCode_Application_Contracts_Dto_PostMessageResponseDto } from '../models/PCode_Application_Contracts_Dto_PostMessageResponseDto';
import type { PCode_Application_Contracts_Dto_ProcessingStatusDto } from '../models/PCode_Application_Contracts_Dto_ProcessingStatusDto';
import type { PCode_Application_Contracts_Dto_ProposalNameResponseDto } from '../models/PCode_Application_Contracts_Dto_ProposalNameResponseDto';
import type { PCode_Application_Contracts_Dto_SessionListResponseDto } from '../models/PCode_Application_Contracts_Dto_SessionListResponseDto';
import type { PCode_Application_Contracts_Dto_SimpleMessageResponseDto } from '../models/PCode_Application_Contracts_Dto_SimpleMessageResponseDto';
import type { PCode_Application_Contracts_Dto_WorkspaceDeletionResponseDto } from '../models/PCode_Application_Contracts_Dto_WorkspaceDeletionResponseDto';
import type { PCode_Models_OpenSpecFileResponseDto } from '../models/PCode_Models_OpenSpecFileResponseDto';
import type { PCode_Models_SessionResponseDto } from '../models/PCode_Models_SessionResponseDto';
import type { PCode_Models_SessionType } from '../models/PCode_Models_SessionType';
import type { PCode_Web_Controllers_CancelSessionResponseDto } from '../models/PCode_Web_Controllers_CancelSessionResponseDto';
import type { PCode_Web_Controllers_CreateAutoTaskSessionRequest } from '../models/PCode_Web_Controllers_CreateAutoTaskSessionRequest';
import type { PCode_Web_Controllers_CreateChatSessionRequest } from '../models/PCode_Web_Controllers_CreateChatSessionRequest';
import type { PCode_Web_Controllers_CreateSessionRequest } from '../models/PCode_Web_Controllers_CreateSessionRequest';
import type { PCode_Web_Controllers_OpenInVsCodeResponseDto } from '../models/PCode_Web_Controllers_OpenInVsCodeResponseDto';
import type { PCode_Web_Controllers_OptimizeDescriptionRequest } from '../models/PCode_Web_Controllers_OptimizeDescriptionRequest';
import type { PCode_Web_Controllers_PostMessageRequest } from '../models/PCode_Web_Controllers_PostMessageRequest';
import type { PCode_Web_Controllers_UpdateSessionRequest } from '../models/PCode_Web_Controllers_UpdateSessionRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SessionsService {
  /**
   * Creates a new Chat session with an initial prompt template and optional custom message.
   * This endpoint is specifically designed for AI auto-task scenarios where sessions need
   * to be created with predefined prompt templates.
   * The prompt ID should be in the format "scenario.locale" (e.g., "auto-compose-commit.en-US").
   * For user preset sessions, use "user-preset.{locale}" format with a non-empty message parameter.
   * For unified docs maintenance, use "claude-md-update.{locale}".
   * If a custom message is provided for other scenarios, it will be used instead of the prompt template.
   * AutoTask executor selection is not client-configurable through this endpoint.
   * Runtime routing is resolved from the mapped hero dungeon member selection or emergency/global fallback,
   * and the initial message is sent asynchronously after session creation.
   * @returns PCode_Models_SessionResponseDto Session created successfully
   * @throws ApiError
   */
  public static postApiSessionsAutoTask({
    requestBody,
  }: {
    /**
     * The request containing session title, project ID, prompt ID, optional scriptKey, and optional message
     */
    requestBody?: PCode_Web_Controllers_CreateAutoTaskSessionRequest,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/auto-task',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Missing required fields or invalid prompt ID`,
        404: `Project not found`,
        500: `Internal server error`,
      },
    });
  }
  /**
   * Archives a chat session (Chat type only).
   * Validates that the session exists and is a Chat type before archiving.
   * @returns PCode_Application_Contracts_Dto_SimpleMessageResponseDto Chat session archived successfully
   * @throws ApiError
   */
  public static postApiSessionsArchiveChat({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/archive-chat',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        400: `Session is not a chat session`,
        404: `Session not found`,
        500: `Failed to archive chat session`,
      },
    });
  }
  /**
   * Creates a new normal chat session using the dedicated chat creation contract.
   * @returns PCode_Models_SessionResponseDto OK
   * @throws ApiError
   */
  public static postApiSessionsChat({
    requestBody,
  }: {
    /**
     * The chat creation request.
     */
    requestBody?: PCode_Web_Controllers_CreateChatSessionRequest,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/chat',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
      },
    });
  }
  /**
   * Creates a new session using the existing mixed session contract.
   * Proposal creation remains the primary usage of this endpoint.
   * @returns PCode_Models_SessionResponseDto OK
   * @throws ApiError
   */
  public static postApiSessions({
    requestBody,
  }: {
    /**
     * The session creation request.
     */
    requestBody?: PCode_Web_Controllers_CreateSessionRequest,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions',
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Bad Request`,
      },
    });
  }
  /**
   * Gets a list of sessions with optional filters.
   * Returns a maximum of 100 most recent sessions to ensure optimal performance.
   * @returns PCode_Application_Contracts_Dto_SessionListResponseDto OK
   * @throws ApiError
   */
  public static getApiSessions({
    type,
    activeOnly,
    includeArchived,
    projectId,
    projectIds,
  }: {
    /**
     * Optional session type filter (Chat/Proposal)
     */
    type?: PCode_Models_SessionType,
    /**
     * If true, returns only active (non-archived) sessions
     */
    activeOnly?: boolean,
    /**
     * If true, includes archived sessions in results
     */
    includeArchived?: boolean,
    /**
     * Optional single project ID filter
     */
    projectId?: string,
    /**
     * Optional multiple project IDs filter
     */
    projectIds?: Array<string>,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SessionListResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Sessions',
      query: {
        'type': type,
        'activeOnly': activeOnly,
        'includeArchived': includeArchived,
        'projectId': projectId,
        'projectIds': projectIds,
      },
    });
  }
  /**
   * Retrieves a specific session by its ID
   * - If session is a proposal type and has a proposal name, response will include OpenSpec files information
   * - The OpenSpec files information contains a list of all available files in proposal directory
   * - If project associated with session cannot be found, OpenSpec files will be null
   * @returns PCode_Models_SessionResponseDto Session found and returned successfully
   * @throws ApiError
   */
  public static getApiSessions1({
    sessionId,
  }: {
    /**
     * The unique identifier of session (GUID format)
     */
    sessionId: string,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Sessions/{sessionId}',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        400: `Invalid session ID format`,
        404: `Session not found`,
        500: `Internal server error occurred`,
      },
    });
  }
  /**
   * @returns any OK
   * @throws ApiError
   */
  public static putApiSessions({
    sessionId,
    requestBody,
  }: {
    sessionId: string,
    requestBody?: PCode_Web_Controllers_UpdateSessionRequest,
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: 'PUT',
      url: '/api/Sessions/{sessionId}',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Deletes a session
   * For Chat sessions, deleteFiles parameter is ignored as file deletion is not applicable.
   * For Proposal sessions, deleteFiles parameter controls whether to delete associated OpenSpec files.
   * @returns PCode_Application_Contracts_Dto_SimpleMessageResponseDto Session deleted successfully
   * @throws ApiError
   */
  public static deleteApiSessions({
    sessionId,
    deleteFiles = false,
  }: {
    /**
     * The unique identifier of session
     */
    sessionId: string,
    /**
     * Whether to delete associated OpenSpec files (only applicable to Proposal sessions)
     */
    deleteFiles?: boolean,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Sessions/{sessionId}',
      path: {
        'sessionId': sessionId,
      },
      query: {
        'deleteFiles': deleteFiles,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to delete session`,
      },
    });
  }
  /**
   * Cancels a running session operation
   * @returns PCode_Web_Controllers_CancelSessionResponseDto Session cancelled successfully
   * @throws ApiError
   */
  public static postApiSessionsCancel({
    sessionId,
  }: {
    /**
     * The unique identifier of session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Web_Controllers_CancelSessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/cancel',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to cancel session`,
      },
    });
  }
  /**
   * Gets processing status for a session
   * This endpoint returns real-time information about session's processing state,
   * including whether a message is currently being processed and details about queued messages.
   * @returns PCode_Application_Contracts_Dto_ProcessingStatusDto Processing status retrieved successfully
   * @throws ApiError
   */
  public static getApiSessionsProcessingStatus({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProcessingStatusDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Sessions/{sessionId}/processing-status',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to get processing status`,
      },
    });
  }
  /**
   * Cancels a specific pending message from the queue by its index
   * @returns PCode_Application_Contracts_Dto_CancelPendingMessageDto Message was cancelled successfully
   * @throws ApiError
   */
  public static deleteApiSessionsQueue({
    sessionId,
    queueIndex,
  }: {
    /**
     * The unique identifier of session
     */
    sessionId: string,
    /**
     * The zero-based index of the message in the queue to cancel
     */
    queueIndex: number,
  }): CancelablePromise<PCode_Application_Contracts_Dto_CancelPendingMessageDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Sessions/{sessionId}/queue/{queueIndex}',
      path: {
        'sessionId': sessionId,
        'queueIndex': queueIndex,
      },
      errors: {
        400: `Invalid queue index`,
        404: `Session not found`,
        500: `Failed to cancel message`,
      },
    });
  }
  /**
   * @returns PCode_Application_Contracts_Dto_PostMessageResponseDto OK
   * @throws ApiError
   */
  public static postApiSessionsMessages({
    sessionId,
    requestBody,
  }: {
    sessionId: string,
    requestBody?: PCode_Web_Controllers_PostMessageRequest,
  }): CancelablePromise<PCode_Application_Contracts_Dto_PostMessageResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/messages',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
    });
  }
  /**
   * Submit annotations for proposal files to be processed by AI
   * This endpoint allows users to submit annotations across multiple proposal files.
   * The annotations will be processed by AI systems to automatically modify files.
   * @returns PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto Annotations submitted successfully
   * @throws ApiError
   */
  public static postApiSessionsAnnotations({
    sessionId,
    requestBody,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    /**
     * Annotation submission data
     */
    requestBody?: PCode_Application_Contracts_Dto_AnnotationSubmissionDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_AnnotationSubmissionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/annotations',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request or session is not a proposal session`,
        404: `Session not found`,
        500: `Failed to process annotations`,
      },
    });
  }
  /**
   * Generates a proposal name for a proposal session using AI
   * @returns PCode_Application_Contracts_Dto_ProposalNameResponseDto Proposal name generated successfully
   * @throws ApiError
   */
  public static postApiSessionsGenerateProposalName({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_ProposalNameResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/generate-proposal-name',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        400: `Session is not a proposal session or proposal name already exists`,
        404: `Session not found`,
        409: `Proposal name already exists for this session`,
        500: `Failed to generate proposal name`,
      },
    });
  }
  /**
   * Optimizes a proposal description using AI to improve structure and clarity (async fire-and-forget)
   * @returns PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto Optimization task started successfully
   * @throws ApiError
   */
  public static postApiSessionsOptimizeDescription({
    sessionId,
    requestBody,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    /**
     * The request containing the description to optimize
     */
    requestBody?: PCode_Web_Controllers_OptimizeDescriptionRequest,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DescriptionOptimization_OptimizationTaskResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/optimize-description',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid request or empty description`,
        404: `Session not found`,
        500: `Failed to start optimization task`,
      },
    });
  }
  /**
   * Optimizes a proposal title using AI to generate a human-readable title based on the current description
   * This endpoint generates a title based on the current session's description.
   * No request body is needed - the title is generated from the session's existing description.
   * @returns PCode_Application_Contracts_Dto_OptimizedTitleResponseDto Title optimized successfully
   * @throws ApiError
   */
  public static postApiSessionsOptimizeTitle({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_OptimizedTitleResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/optimize-title',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        400: `Invalid request or session has no description`,
        404: `Session not found`,
        500: `Failed to optimize title`,
      },
    });
  }
  /**
   * Generates a proposal for a proposal session by triggering the OpenSpec workflow
   * @returns PCode_Application_Contracts_Dto_SimpleMessageResponseDto Proposal generation started successfully
   * @throws ApiError
   */
  public static postApiSessionsGenerateProposal({
    sessionId,
    requestBody,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    /**
     * Optional request parameters for proposal generation
     */
    requestBody?: PCode_Application_Contracts_Dto_GenerateProposalRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/generate-proposal',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Session is not a proposal session or proposal name not generated`,
        404: `Session not found`,
        500: `Failed to generate proposal`,
      },
    });
  }
  /**
   * Archives a proposal session by executing the OpenSpec archive workflow
   * @returns PCode_Models_SessionResponseDto Session archive started with current session state
   * @throws ApiError
   */
  public static postApiSessionsArchive({
    sessionId,
    requestBody,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_ArchiveSessionRequestDto,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/archive',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Session is not a proposal session or proposal name missing`,
        404: `Session not found`,
        500: `Failed to archive session`,
      },
    });
  }
  /**
   * Executes a proposal by triggering the OpenSpec apply workflow
   * @returns PCode_Application_Contracts_Dto_SimpleMessageResponseDto Proposal execution started successfully
   * @throws ApiError
   */
  public static postApiSessionsExecuteProposal({
    sessionId,
    requestBody,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    requestBody?: PCode_Application_Contracts_Dto_ExecuteProposalRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_SimpleMessageResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/execute-proposal',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Session is not a proposal session, not in valid status, or proposal name missing`,
        404: `Session not found`,
        500: `Failed to execute proposal`,
      },
    });
  }
  /**
   * Marks a proposal session as completed (ExecutionCompleted → Completed)
   * This endpoint allows users to mark a proposal session as completed after the execution finishes.
   * The session must be in ExecutionCompleted status to be marked as completed.
   * @returns PCode_Models_SessionResponseDto Session marked as completed successfully
   * @throws ApiError
   */
  public static postApiSessionsComplete({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Models_SessionResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/complete',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        400: `Session is not in ExecutionCompleted status`,
        404: `Session not found`,
        500: `Failed to complete session`,
      },
    });
  }
  /**
   * Validates if a proposal session can be executed immediately
   * This endpoint validates if a proposal session is ready for immediate execution.
   * Checks include: proposal name is set, OpenSpec folder exists, proposal.md exists, and session status allows execution.
   * @returns PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto Validation completed successfully
   * @throws ApiError
   */
  public static postApiSessionsValidateExecute({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/validate-execute',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to validate session`,
      },
    });
  }
  /**
   * Validates if a proposal session can be set to pending execution status
   * This endpoint validates if a proposal session is ready to be set to pending execution status.
   * Checks include: session status allows start execution, proposal has been reviewed, and session type is proposal.
   * @returns PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto Validation completed successfully
   * @throws ApiError
   */
  public static postApiSessionsValidateStart({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/validate-start',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to validate session`,
      },
    });
  }
  /**
   * Validates if a proposal session can be archived
   * This endpoint validates if a proposal session is ready for archiving.
   * Checks include: session status allows archiving, proposal name is set, and session type is proposal.
   * @returns PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto Validation completed successfully
   * @throws ApiError
   */
  public static postApiSessionsValidateArchive({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_DataManagement_ValidationResultDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/validate-archive',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to validate session`,
      },
    });
  }
  /**
   * Retrieves the content of a specific OpenSpec file for a proposal session
   * This endpoint is used to read individual files from an OpenSpec proposal directory.
   * The relative path should be relative to the openspec folder (e.g., "changes/proposal-name/proposal.md").
   * @returns PCode_Models_OpenSpecFileResponseDto File content retrieved successfully
   * @throws ApiError
   */
  public static getApiSessionsOpenspecFile({
    sessionId,
    relativePath,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    /**
     * The relative path of the file within the OpenSpec directory
     */
    relativePath?: string,
  }): CancelablePromise<PCode_Models_OpenSpecFileResponseDto> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/Sessions/{sessionId}/openspec-file',
      path: {
        'sessionId': sessionId,
      },
      query: {
        'relativePath': relativePath,
      },
      errors: {
        404: `Session not found or file not found`,
        500: `Failed to read file`,
      },
    });
  }
  /**
   * Updates the CessionId for a session, creating a new Claude context
   * @returns PCode_Application_Contracts_Dto_CessionIdResponseDto CessionId updated successfully
   * @throws ApiError
   */
  public static postApiSessionsUpdateCessionId({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_CessionIdResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/update-cession-id',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        404: `Session not found`,
        500: `Failed to update CessionId`,
      },
    });
  }
  /**
   * Opens project workspace in VS Code with optional sub-path support for MonoSpec repositories
   * This endpoint launches VS Code as an independent process for to project workspace
   * associated with session. Supports Windows, macOS, and Linux platforms.
   * For MonoSpec repositories, subPath parameter allows opening a specific sub-repository.
   * @returns PCode_Web_Controllers_OpenInVsCodeResponseDto VS Code launched successfully
   * @throws ApiError
   */
  public static postApiSessionsOpenInVscode({
    sessionId,
    subPath,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
    /**
     * Optional relative path to sub-repository (e.g., "repos/web")
     */
    subPath?: string,
  }): CancelablePromise<PCode_Web_Controllers_OpenInVsCodeResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/open-in-vscode',
      path: {
        'sessionId': sessionId,
      },
      query: {
        'subPath': subPath,
      },
      errors: {
        400: `Invalid project path or sub-path`,
        403: `Sub-path is outside project directory`,
        404: `Session not found`,
        500: `Failed to launch VS Code`,
      },
    });
  }
  /**
   * Corrects the proposal name for a session
   * This endpoint allows users to correct AI-generated proposal names that may contain errors.
   * The new name must follow kebab-case conventions and be unique within project.
   * @returns PCode_Application_Contracts_Dto_CorrectProposalNameResponseDto Proposal name corrected successfully
   * @throws ApiError
   */
  public static postApiSessionsCorrectProposalName({
    sessionId,
    requestBody,
  }: {
    /**
     * The unique identifier of session
     */
    sessionId: string,
    /**
     * The correction request containing new proposal name
     */
    requestBody?: PCode_Application_Contracts_Dto_CorrectProposalNameRequestDto,
  }): CancelablePromise<PCode_Application_Contracts_Dto_CorrectProposalNameResponseDto> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/Sessions/{sessionId}/correct-proposal-name',
      path: {
        'sessionId': sessionId,
      },
      body: requestBody,
      mediaType: 'application/json',
      errors: {
        400: `Invalid name format or validation failed`,
        404: `Session not found`,
        409: `Name already in use by another session`,
        500: `Internal server error`,
      },
    });
  }
  /**
   * Deletes the independent Git worktree workspace for a session
   * This endpoint manually removes the Git worktree created for session's independent workspace.
   * Before deletion, any uncommitted changes will be automatically committed.
   * After deletion, session's WorkingDirectory will remain unchanged (no automatic reversion).
   * @returns PCode_Application_Contracts_Dto_WorkspaceDeletionResponseDto Workspace deleted successfully
   * @throws ApiError
   */
  public static deleteApiSessionsWorkspace({
    sessionId,
  }: {
    /**
     * The unique identifier of the session
     */
    sessionId: string,
  }): CancelablePromise<PCode_Application_Contracts_Dto_WorkspaceDeletionResponseDto> {
    return __request(OpenAPI, {
      method: 'DELETE',
      url: '/api/Sessions/{sessionId}/workspace',
      path: {
        'sessionId': sessionId,
      },
      errors: {
        400: `Session does not have an independent workspace`,
        404: `Session not found`,
        500: `Failed to delete workspace`,
      },
    });
  }
}

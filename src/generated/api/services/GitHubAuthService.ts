/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_GitHubAuthStatusResponse } from '../models/PCode_Web_Controllers_GitHubAuthStatusResponse';
import type { PCode_Web_Controllers_GitHubAuthTokenResponse } from '../models/PCode_Web_Controllers_GitHubAuthTokenResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GitHubAuthService {
  /**
   * Gets the current GitHub CLI authentication status for the local runtime.
   * @returns PCode_Web_Controllers_GitHubAuthStatusResponse OK
   * @throws ApiError
   */
  public static getApiGitHubAuthStatus(): CancelablePromise<PCode_Web_Controllers_GitHubAuthStatusResponse> {
    return __request(OpenAPI, {
      method: 'GET',
      url: '/api/GitHubAuth/status',
    });
  }
  /**
   * Gets a session-scoped GitHub token from the local GitHub CLI login.
   * @returns PCode_Web_Controllers_GitHubAuthTokenResponse OK
   * @throws ApiError
   */
  public static postApiGitHubAuthToken(): CancelablePromise<PCode_Web_Controllers_GitHubAuthTokenResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/GitHubAuth/token',
    });
  }
}

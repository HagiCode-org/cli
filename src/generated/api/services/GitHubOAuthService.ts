/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_GitHubOAuthCallbackRequest } from '../models/PCode_Web_Controllers_GitHubOAuthCallbackRequest';
import type { PCode_Web_Controllers_GitHubOAuthResponse } from '../models/PCode_Web_Controllers_GitHubOAuthResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GitHubOAuthService {
  /**
   * OAuth callback endpoint - exchanges authorization code for access token
   * @returns PCode_Web_Controllers_GitHubOAuthResponse OK
   * @throws ApiError
   */
  public static postApiGitHubOAuthCallback({
    requestBody,
  }: {
    /**
     * OAuth callback request with code and state
     */
    requestBody?: PCode_Web_Controllers_GitHubOAuthCallbackRequest,
  }): CancelablePromise<PCode_Web_Controllers_GitHubOAuthResponse> {
    return __request(OpenAPI, {
      method: 'POST',
      url: '/api/GitHubOAuth/callback',
      body: requestBody,
      mediaType: 'application/json',
    });
  }
}

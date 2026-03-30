/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * OAuth callback request from frontend
 */
export type PCode_Web_Controllers_GitHubOAuthCallbackRequest = {
  /**
   * Authorization code from GitHub
   */
  code?: string | null;
  /**
   * State parameter for CSRF protection
   */
  state?: string | null;
  /**
   * Redirect URI used in the OAuth flow
   */
  redirectUri?: string | null;
};


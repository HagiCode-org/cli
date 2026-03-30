/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_GitHubUserInfo } from './PCode_Web_Controllers_GitHubUserInfo';
/**
 * OAuth response from backend
 */
export type PCode_Web_Controllers_GitHubOAuthResponse = {
  /**
   * Whether the OAuth flow was successful
   */
  success?: boolean;
  /**
   * Access token from GitHub (if successful)
   */
  accessToken?: string | null;
  /**
   * Token type (usually "bearer")
   */
  tokenType?: string | null;
  /**
   * Granted scopes
   */
  scope?: string | null;
  user?: PCode_Web_Controllers_GitHubUserInfo;
  /**
   * Error message (if failed)
   */
  error?: string | null;
};


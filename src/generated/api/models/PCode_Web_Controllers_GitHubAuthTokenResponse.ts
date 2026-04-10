/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_GitHubUserInfo } from './PCode_Web_Controllers_GitHubUserInfo';
/**
 * Session token response returned to the frontend on demand.
 */
export type PCode_Web_Controllers_GitHubAuthTokenResponse = {
  /**
   * Authentication source identifier.
   */
  authSource?: string | null;
  /**
   * Whether the GitHub CLI is available in the current runtime PATH.
   */
  ghAvailable?: boolean;
  /**
   * Whether the CLI reports an authenticated session for github.com.
   */
  isAuthenticated?: boolean;
  /**
   * Scopes reported by the active GitHub CLI session, when available.
   */
  scopes?: Array<string> | null;
  user?: PCode_Web_Controllers_GitHubUserInfo;
  /**
   * Stable machine-readable error code for remediation.
   */
  errorCode?: string | null;
  /**
   * Human-readable error summary.
   */
  error?: string | null;
  /**
   * Suggested remediation command to run locally.
   */
  remediationCommand?: string | null;
  /**
   * Suggested remediation URL for installation or setup help.
   */
  remediationUrl?: string | null;
  /**
   * Human-readable remediation guidance.
   */
  remediationMessage?: string | null;
  /**
   * Whether the token retrieval completed successfully.
   */
  success?: boolean;
  /**
   * Session-scoped GitHub access token.
   */
  accessToken?: string | null;
  /**
   * Token type used for Authorization headers.
   */
  tokenType?: string | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_GitHubUserInfo } from './PCode_Web_Controllers_GitHubUserInfo';
/**
 * Local GitHub CLI authentication status returned to the frontend.
 */
export type PCode_Web_Controllers_GitHubAuthStatusResponse = {
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
};


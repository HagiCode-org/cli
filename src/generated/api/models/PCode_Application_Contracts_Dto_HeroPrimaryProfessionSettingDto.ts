/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallMode } from './PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallMode';
import type { PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus } from './PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus';
import type { PCode_Models_AIProviderType } from './PCode_Models_AIProviderType';
export type PCode_Application_Contracts_Dto_HeroPrimaryProfessionSettingDto = {
  id?: string | null;
  name?: string | null;
  family?: string | null;
  /**
   * Stable frontend localization key for the profession summary.
   */
  summary?: string | null;
  icon?: string | null;
  /**
   * Stable frontend localization key for the source label.
   */
  sourceLabel?: string | null;
  providerType?: PCode_Models_AIProviderType;
  sortOrder?: number;
  isReadOnly?: boolean;
  defaultParameters?: Record<string, string | null> | null;
  /**
   * Persisted enablement state for this primary profession.
   */
  isEnabled?: boolean;
  /**
   * Whether this primary profession is marked as beta.
   */
  isBeta?: boolean;
  /**
   * Whether the CLI version was detected and is available.
   */
  isCliAvailable?: boolean;
  /**
   * Detected CLI version (if available).
   */
  cliVersion?: string | null;
  installMode?: PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallMode;
  /**
   * Whether the current environment satisfies one-click install prerequisites.
   */
  canInstall?: boolean;
  /**
   * Next-step hint for installation or documentation fallback.
   */
  installHint?: string | null;
  lastInstallStatus?: PCode_Application_Contracts_Dto_HeroPrimaryProfessionInstallStatus;
  /**
   * User-facing message attached to the latest install result.
   */
  lastInstallMessage?: string | null;
  /**
   * Timestamp of the latest install attempt.
   */
  lastInstallAt?: string | null;
};


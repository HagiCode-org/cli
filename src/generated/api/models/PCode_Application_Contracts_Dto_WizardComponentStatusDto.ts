/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Describes the detection and compatibility status of a single wizard prerequisite component.
 */
export type PCode_Application_Contracts_Dto_WizardComponentStatusDto = {
  /**
   * Unique identifier for the component (e.g. "node", "npm", "git", "openspec").
   */
  componentId: string;
  /**
   * Human-readable display name for the component.
   */
  displayName: string;
  /**
   * Whether the component command is available in the resolved runtime environment.
   */
  installed?: boolean;
  /**
   * Detected version string, or null if not installed or version could not be parsed.
   */
  detectedVersion?: string | null;
  /**
   * Whether the detected version satisfies the required compatibility range.
   * Null when Installed is false.
   */
  compatible?: boolean | null;
  /**
   * Human-readable reason when the component is not installed or not compatible.
   */
  failureReason?: string | null;
  /**
   * Required version range hint for display (e.g. ">=1.0 <2.0").
   * Null for components that have no version requirement.
   */
  requiredVersionRange?: string | null;
  /**
   * Whether the wizard is allowed to install this component.
   */
  supportsInstall?: boolean;
};


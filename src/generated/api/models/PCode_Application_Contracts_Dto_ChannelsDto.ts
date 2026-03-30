/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Channels structure organizing version strings by distribution channel
 */
export type PCode_Application_Contracts_Dto_ChannelsDto = {
  /**
   * Stable releases - production-ready versions
   */
  stable?: Array<string> | null;
  /**
   * Beta releases - pre-release versions for testing
   */
  beta?: Array<string> | null;
  /**
   * Preview releases - early access/alpha versions
   */
  preview?: Array<string> | null;
  /**
   * Additional custom channels can be added dynamically
   */
  custom?: Record<string, Array<string>> | null;
};


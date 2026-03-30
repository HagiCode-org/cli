/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Request DTO for setting AI language preference.
 */
export type PCode_Application_Contracts_Dto_SetAILanguageRequestDto = {
  /**
   * Language preference: "follow", "zh-CN", "en-US", or null.
   */
  language?: string | null;
  /**
   * Current interface language (only used when Language is "follow").
   */
  currentInterfaceLanguage?: string | null;
};


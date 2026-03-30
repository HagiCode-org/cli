/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * DTO for client configuration parameters
 */
export type PCode_Web_DoubaoVoice_WebProxy_Models_ClientConfigDto = {
  appId?: string | null;
  accessToken?: string | null;
  serviceUrl?: string | null;
  resourceId?: string | null;
  sampleRate?: number | null;
  bitsPerSample?: number | null;
  channels?: number | null;
  enableDebugLogging?: boolean | null;
  debugAudioRetentionDays?: number | null;
  /**
   * Timeout for voice recognition in seconds (default: 300 seconds / 5 minutes).
   * Valid range: 10-600 seconds. When not provided, defaults to 300 seconds.
   */
  timeoutSeconds?: number | null;
  /**
   * Multi-line hotword text, each line represents a hotword phrase.
   * Will be parsed into a list and used for corpus.context.
   */
  contextText?: string | null;
  /**
   * Doubao platform hotword table ID for corpus.boosting_table_id.
   * Should be the table ID from Doubao's self-learning platform.
   */
  boosting_table_id?: string | null;
  /**
   * Whether to combine both hotword modes (context text and boosting_table_id).
   * When false, only context text is used if both are provided.
   */
  combineMode?: boolean | null;
};


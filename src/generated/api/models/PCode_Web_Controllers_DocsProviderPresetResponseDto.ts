/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_DocsProviderPromotionDto } from './PCode_Web_Controllers_DocsProviderPromotionDto';
/**
 * Same-origin proxy payload for an individual provider preset document.
 */
export type PCode_Web_Controllers_DocsProviderPresetResponseDto = {
  /**
   * Stable provider identifier.
   */
  providerId?: string | null;
  /**
   * Provider display name.
   */
  name?: string | null;
  /**
   * Provider description text.
   */
  description?: string | null;
  /**
   * Referral or landing page URL associated with the provider.
   */
  referralUrl?: string | null;
  promotion?: PCode_Web_Controllers_DocsProviderPromotionDto;
};


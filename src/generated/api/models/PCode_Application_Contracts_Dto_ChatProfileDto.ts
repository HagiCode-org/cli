/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Chat profile payload for the current user.
 */
export type PCode_Application_Contracts_Dto_ChatProfileDto = {
  /**
   * Custom nickname persisted for chat identity rendering.
   */
  nickname?: string | null;
  /**
   * Whether a custom nickname has been saved.
   */
  hasCustomNickname?: boolean;
  /**
   * Managed image identifier for the current avatar.
   */
  avatarImageId?: string | null;
  /**
   * Server preview URL for the current avatar.
   */
  avatarPreviewUrl?: string | null;
  /**
   * Managed hagiimag URL for the current avatar.
   */
  avatarHagiImageUrl?: string | null;
  /**
   * Whether a custom avatar has been saved.
   */
  hasCustomAvatar?: boolean;
  /**
   * When the chat profile was last updated.
   */
  updatedAt?: string | null;
};


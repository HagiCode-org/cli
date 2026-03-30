/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_RssFeedItemDto } from './PCode_Application_Contracts_Dto_RssFeedItemDto';
/**
 * Response DTO containing RSS feed items with metadata
 */
export type PCode_Application_Contracts_Dto_RssFeedResponseDto = {
  /**
   * List of RSS feed items (blog posts/articles)
   */
  items?: Array<PCode_Application_Contracts_Dto_RssFeedItemDto> | null;
  /**
   * The timestamp when this RSS feed was last fetched/updated
   */
  lastUpdated?: string;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Published proposal dungeon recommendation binding for a character template.
 */
export type PCode_Web_Controllers_CharacterTemplateDungeonBindingDto = {
  /**
   * Stable proposal flow script key.
   */
  scriptKey?: string | null;
  /**
   * Ordered tag matches that produced this binding.
   */
  matchedTags?: Array<string> | null;
  /**
   * Ordered tag groups that contributed to the match.
   */
  matchedTagGroups?: Array<string> | null;
  /**
   * Lower values indicate higher recommendation priority.
   */
  priority?: number | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Web_Controllers_CharacterTemplateDungeonBindingDto } from './PCode_Web_Controllers_CharacterTemplateDungeonBindingDto';
import type { PCode_Web_Controllers_CharacterTemplateTagGroupsDto } from './PCode_Web_Controllers_CharacterTemplateTagGroupsDto';
/**
 * Shared summary metadata for a published character template.
 */
export type PCode_Web_Controllers_CharacterTemplateSummaryDto = {
  /**
   * Stable template identifier.
   */
  id?: string | null;
  /**
   * Human-readable template name.
   */
  name?: string | null;
  /**
   * Short template summary.
   */
  summary?: string | null;
  /**
   * Stable detail path for the template JSON resource.
   */
  path?: string | null;
  /**
   * Stable template version emitted by the index site.
   */
  templateVersion?: string | null;
  /**
   * Published template composition mode.
   */
  templateMode?: string | null;
  /**
   * Declares which local draft sections the template is allowed to overwrite.
   */
  applyScope?: Array<string> | null;
  /**
   * Flat tag array for search, indexing, and display metadata. `universal` stays a plain tech tag here and does not create a separate filter contract.
   */
  tags?: Array<string> | null;
  tagGroups?: PCode_Web_Controllers_CharacterTemplateTagGroupsDto;
  /**
   * Suggested usage scenes for the template.
   */
  scenes?: Array<string> | null;
  /**
   * Optional proposal dungeon recommendation bindings for the template.
   */
  dungeonBindings?: Array<PCode_Web_Controllers_CharacterTemplateDungeonBindingDto> | null;
};


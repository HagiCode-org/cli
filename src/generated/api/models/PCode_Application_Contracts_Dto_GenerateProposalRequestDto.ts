/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PCode_Application_Contracts_Dto_PlanningDirectionOptionDto } from './PCode_Application_Contracts_Dto_PlanningDirectionOptionDto';
/**
 * Request DTO for generating a proposal
 */
export type PCode_Application_Contracts_Dto_GenerateProposalRequestDto = {
  /**
   * Whether to enable explore mode during proposal generation.
   * When true, the proposal generation will include an explore step for deeper analysis.
   * When false, the proposal generation will skip the explore step for faster results.
   * If not specified, defaults to the backend planning direction catalog.
   * When PCode.Application.Contracts.Dto.GenerateProposalRequestDto.PlanningDirections is provided, that collection is authoritative and this field is compatibility-only.
   */
  enableExploreMode?: boolean | null;
  /**
   * Optional explicit planning directions for this proposal generation run.
   * When provided, each supported direction can independently override backend defaults.
   * Unsupported direction identifiers are rejected.
   */
  planningDirections?: Array<PCode_Application_Contracts_Dto_PlanningDirectionOptionDto> | null;
  /**
   * Required canonical language code for natural-language proposal content.
   * Valid values are zh-CN, zh-Hant, en-US, ja-JP, ko-KR, de-DE, fr-FR, es-ES, pt-BR, and ru-RU.
   * This is independent from the AI prompt locale.
   */
  proposalContentLanguage: string;
  /**
   * Optional hero override for this proposal generation request.
   * The hero must belong to the generate-stage script roster and be eligible.
   */
  heroId?: string | null;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Application_Contracts_Dto_HeroTraitDto = {
  sourceTraitId?: string | null;
  /**
   * Canonical marketplace id resolved from PCode.Application.Contracts.Dto.HeroTraitDto.SourceTraitId when the trait points to an official catalog entry.
   * Historical or unknown sources keep this field empty while preserving the snapshot text.
   */
  traitCatalogId?: string | null;
  name: string;
  summary?: string | null;
  prompt: string;
  sortOrder?: number;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PCode_Web_Controllers_OptimizeDescriptionRequest = {
  description: string;
  /**
   * Optional optimization direction provided by user to guide AI optimization
   */
  optimizationDirection?: string | null;
  /**
   * Whether to enable long-term memory during description optimization.
   */
  enableMemoryOptimization?: boolean;
  /**
   * Whether title is default placeholder "新建主意" (New Proposal).
   * When true, title should not be used as a semantic optimization constraint.
   */
  isDefaultTitle?: boolean;
};


/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Basic health status of the PCode.Web service (liveness probe)
 */
export type PCode_Application_Contracts_Dto_BasicHealthStatusDto = {
  /**
   * Health status: "healthy" or "unhealthy"
   */
  status?: string | null;
  /**
   * UTC timestamp of when the health check was performed
   */
  timestamp?: string;
  /**
   * Service name identifier
   */
  service?: string | null;
  /**
   * Error message if status is "unhealthy". Null when healthy.
   */
  error?: string | null;
};


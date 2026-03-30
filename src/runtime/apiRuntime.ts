import { OpenAPI } from '../generated/api/core/OpenAPI';

export const DEFAULT_API_BASE_URL = 'http://127.0.0.1:35168';

export type ApiRuntimeInput = {
  baseUrl?: string;
  token?: string;
  lang?: string;
};

export type ResolvedApiRuntimeConfig = {
  baseUrl: string;
  token?: string;
  lang?: string;
};

export function normalizeRuntimeValue(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function resolveApiRuntimeConfig(
  input: ApiRuntimeInput = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedApiRuntimeConfig {
  return {
    baseUrl:
      normalizeRuntimeValue(input.baseUrl) ??
      normalizeRuntimeValue(env.HAGI_API_BASE_URL) ??
      DEFAULT_API_BASE_URL,
    token: normalizeRuntimeValue(input.token) ?? normalizeRuntimeValue(env.HAGI_API_TOKEN),
    lang: normalizeRuntimeValue(input.lang) ?? normalizeRuntimeValue(env.HAGI_API_LANG),
  };
}

export function configureApiRuntime(
  input: ApiRuntimeInput = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedApiRuntimeConfig {
  const resolved = resolveApiRuntimeConfig(input, env);

  OpenAPI.BASE = resolved.baseUrl;
  OpenAPI.WITH_CREDENTIALS = false;
  OpenAPI.CREDENTIALS = 'omit';
  OpenAPI.TOKEN = resolved.token;
  OpenAPI.HEADERS = resolved.lang
    ? {
        'Accept-Language': resolved.lang,
      }
    : undefined;

  return resolved;
}

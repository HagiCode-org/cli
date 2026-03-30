import { describe, expect, it } from 'vitest';
import {
  DEFAULT_API_BASE_URL,
  configureApiRuntime,
  resolveApiRuntimeConfig,
} from '../../src/runtime/apiRuntime';
import { OpenAPI } from '../../src/generated/api/core/OpenAPI';

describe('apiRuntime', () => {
  it('prefers flags over environment variables', () => {
    const resolved = resolveApiRuntimeConfig(
      {
        baseUrl: 'https://flag.example',
        token: 'flag-token',
        lang: 'en-US',
      },
      {
        HAGI_API_BASE_URL: 'https://env.example',
        HAGI_API_TOKEN: 'env-token',
        HAGI_API_LANG: 'zh-CN',
      },
    );

    expect(resolved).toEqual({
      baseUrl: 'https://flag.example',
      token: 'flag-token',
      lang: 'en-US',
    });
  });

  it('falls back to environment variables and the local default URL', () => {
    expect(resolveApiRuntimeConfig({}, {})).toEqual({
      baseUrl: DEFAULT_API_BASE_URL,
      token: undefined,
      lang: undefined,
    });

    expect(resolveApiRuntimeConfig({}, { HAGI_API_BASE_URL: 'https://env.example' }).baseUrl).toBe(
      'https://env.example',
    );
  });

  it('writes the resolved values into the generated OpenAPI runtime', () => {
    configureApiRuntime(
      {
        baseUrl: 'https://runtime.example',
        token: 'runtime-token',
        lang: 'ja-JP',
      },
      {},
    );

    expect(OpenAPI.BASE).toBe('https://runtime.example');
    expect(OpenAPI.TOKEN).toBe('runtime-token');
    expect(OpenAPI.HEADERS).toEqual({
      'Accept-Language': 'ja-JP',
    });
    expect(OpenAPI.WITH_CREDENTIALS).toBe(false);
    expect(OpenAPI.CREDENTIALS).toBe('omit');
  });
});

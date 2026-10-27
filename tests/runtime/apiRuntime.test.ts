import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  configureApiRuntime,
  getActiveBaseUrl,
  getActiveRuntime,
  resolveApiRuntimeConfig,
  resolveConfigFilePath,
} from '../../src/runtime/apiRuntime';
import { GRPC_PATH_PREFIX, headerInterceptor, resolveGrpcBaseUrl } from '../../src/runtime/grpc/transport';
import { CliUsageError } from '../../src/runtime/errors';
import { CLI_CLIENT_MARKER } from '../../src/runtime/version';

/** Runs the header interceptor over a bare request and returns the headers it ended up with. */
async function interceptedHeaders(): Promise<Headers> {
  const request = { header: new Headers() } as never as Parameters<ReturnType<typeof headerInterceptor>>[0];
  await headerInterceptor((async (req: { header: Headers }) => req) as never)(request);
  return (request as unknown as { header: Headers }).header;
}

describe('apiRuntime', () => {
  let configHome: string;

  beforeEach(() => {
    configHome = mkdtempSync(join(tmpdir(), 'hagi-config-'));
  });

  afterEach(() => {
    rmSync(configHome, { recursive: true, force: true });
  });

  function writeConfig(content: string): void {
    mkdirSync(join(configHome, 'hagi'), { recursive: true });
    writeFileSync(join(configHome, 'hagi', 'config.json'), content, 'utf8');
  }

  it('prefers the --base-url flag over the environment variable and the config file', () => {
    writeConfig(JSON.stringify({ baseUrl: 'https://config.example' }));

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
        XDG_CONFIG_HOME: configHome,
      },
    );

    expect(resolved).toEqual({
      baseUrl: 'https://flag.example',
      token: 'flag-token',
      lang: 'en-US',
    });
  });

  it('prefers HAGI_API_BASE_URL over the config file when no flag is given', () => {
    writeConfig(JSON.stringify({ baseUrl: 'https://config.example' }));

    expect(
      resolveApiRuntimeConfig({}, { HAGI_API_BASE_URL: 'https://env.example', XDG_CONFIG_HOME: configHome }).baseUrl,
    ).toBe('https://env.example');
  });

  it('uses the config file baseUrl when neither the flag nor the environment variable is set', () => {
    writeConfig(JSON.stringify({ baseUrl: ' https://config.example ' }));

    expect(resolveApiRuntimeConfig({}, { XDG_CONFIG_HOME: configHome })).toEqual({
      baseUrl: 'https://config.example',
      token: undefined,
      lang: undefined,
    });
  });

  it('fails with an actionable usage error when no base URL is configured', () => {
    expect(() => resolveApiRuntimeConfig({}, { XDG_CONFIG_HOME: configHome })).toThrow(CliUsageError);

    try {
      resolveApiRuntimeConfig({}, { XDG_CONFIG_HOME: configHome });
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('--base-url');
      expect(message).toContain('HAGI_API_BASE_URL');
      expect(message).toContain(resolveConfigFilePath({ XDG_CONFIG_HOME: configHome }));
    }
  });

  it('treats a blank environment variable and a config file without baseUrl as unset', () => {
    writeConfig(JSON.stringify({ other: 'value' }));

    expect(() =>
      resolveApiRuntimeConfig({}, { HAGI_API_BASE_URL: '   ', XDG_CONFIG_HOME: configHome }),
    ).toThrow(CliUsageError);
  });

  it('rejects a malformed config file with a usage error that names the file', () => {
    writeConfig('{ not json');

    expect(() => resolveApiRuntimeConfig({}, { XDG_CONFIG_HOME: configHome })).toThrow(
      /is not valid JSON/,
    );
  });

  it('keeps the resolved values as the active runtime', () => {
    configureApiRuntime({ baseUrl: 'https://runtime.example', token: 'runtime-token', lang: 'ja-JP' }, {});

    expect(getActiveRuntime()).toEqual({ baseUrl: 'https://runtime.example', token: 'runtime-token', lang: 'ja-JP' });
    expect(getActiveBaseUrl()).toBe('https://runtime.example');
  });

  it('puts the gRPC services under the /grpc prefix of the base URL', () => {
    expect(GRPC_PATH_PREFIX).toBe('/grpc');
    expect(resolveGrpcBaseUrl('https://runtime.example')).toBe('https://runtime.example/grpc');
    expect(resolveGrpcBaseUrl('https://runtime.example///')).toBe('https://runtime.example/grpc');
    expect(resolveGrpcBaseUrl('https://proxy.example/hagi')).toBe('https://proxy.example/hagi/grpc');
  });

  it('sends X-Hagi-Client and no Accept-Language when no language is set', async () => {
    configureApiRuntime({ baseUrl: 'https://runtime.example' }, {});

    const headers = await interceptedHeaders();

    expect(headers.get('X-Hagi-Client')).toBe(CLI_CLIENT_MARKER);
    expect(headers.has('Accept-Language')).toBe(false);
  });

  it('sends X-Hagi-Client together with Accept-Language when a language is set', async () => {
    configureApiRuntime({ baseUrl: 'https://runtime.example', lang: 'zh-CN' }, {});

    const headers = await interceptedHeaders();

    expect(headers.get('X-Hagi-Client')).toBe(CLI_CLIENT_MARKER);
    expect(headers.get('Accept-Language')).toBe('zh-CN');
  });

  it('adds no Authorization header without a token and sends one with a token', async () => {
    configureApiRuntime({ baseUrl: 'https://runtime.example' }, {});

    const anonymous = await interceptedHeaders();
    expect(anonymous.has('Authorization')).toBe(false);
    expect(anonymous.get('X-Hagi-Client')).toBe(CLI_CLIENT_MARKER);

    configureApiRuntime({ baseUrl: 'https://runtime.example', token: 'runtime-token' }, {});

    const authenticated = await interceptedHeaders();
    expect(authenticated.get('Authorization')).toBe('Bearer runtime-token');
    expect(authenticated.get('X-Hagi-Client')).toBe(CLI_CLIENT_MARKER);
  });
});

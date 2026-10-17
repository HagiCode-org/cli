import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  configureApiRuntime,
  resolveApiRuntimeConfig,
  resolveConfigFilePath,
} from '../../src/runtime/apiRuntime';
import { OpenAPI } from '../../src/generated/api/core/OpenAPI';
import { CliUsageError } from '../../src/runtime/errors';

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

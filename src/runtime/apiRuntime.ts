import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CliUsageError } from './errors';
import { CLI_CLIENT_MARKER } from './version';

export const BASE_URL_FLAG = '--base-url';
export const BASE_URL_ENV_VAR = 'HAGI_API_BASE_URL';

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

/**
 * Location of the local CLI configuration file: `$XDG_CONFIG_HOME/hagi/config.json`,
 * falling back to `~/.config/hagi/config.json`. The file holds `{ "baseUrl": "<url>" }`.
 */
export function resolveConfigFilePath(env: NodeJS.ProcessEnv = process.env): string {
  const configHome = normalizeRuntimeValue(env.XDG_CONFIG_HOME) ?? join(homedir(), '.config');
  return join(configHome, 'hagi', 'config.json');
}

/**
 * Reads the base URL from the local config file. A missing file means no value; an unreadable
 * or malformed file is a usage error that names the file.
 */
export function readConfigFileBaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const configPath = resolveConfigFilePath(env);

  let raw: string;
  try {
    raw = readFileSync(configPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new CliUsageError(`Cannot read CLI config file ${configPath}: ${message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliUsageError(`CLI config file ${configPath} is not valid JSON.`);
  }

  const value =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>).baseUrl
      : undefined;

  return typeof value === 'string' ? normalizeRuntimeValue(value) : undefined;
}

export function resolveApiRuntimeConfig(
  input: ApiRuntimeInput = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedApiRuntimeConfig {
  const baseUrl =
    normalizeRuntimeValue(input.baseUrl) ??
    normalizeRuntimeValue(env[BASE_URL_ENV_VAR]) ??
    readConfigFileBaseUrl(env);

  if (!baseUrl) {
    throw new CliUsageError(
      `No backend base URL is configured. Set ${BASE_URL_FLAG} <url>, the ${BASE_URL_ENV_VAR} environment variable, ` +
        `or "baseUrl" in ${resolveConfigFilePath(env)}.`,
    );
  }

  return {
    baseUrl,
    token: normalizeRuntimeValue(input.token) ?? normalizeRuntimeValue(env.HAGI_API_TOKEN),
    lang: normalizeRuntimeValue(input.lang) ?? normalizeRuntimeValue(env.HAGI_API_LANG),
  };
}

let activeRuntime: ResolvedApiRuntimeConfig | undefined;

/**
 * Resolves the backend settings and makes them the active ones. The gRPC transport reads them on every call, so the
 * base URL, bearer token and language of the current invocation apply without rebuilding the facade.
 */
export function configureApiRuntime(
  input: ApiRuntimeInput = {},
  env: NodeJS.ProcessEnv = process.env,
): ResolvedApiRuntimeConfig {
  activeRuntime = resolveApiRuntimeConfig(input, env);
  return activeRuntime;
}

/** Settings most recently applied by `configureApiRuntime`; a call made before any configuration is a usage error. */
export function getActiveRuntime(): ResolvedApiRuntimeConfig {
  if (!activeRuntime) {
    throw new CliUsageError('The backend connection is not configured. Resolve the API runtime before calling the backend.');
  }

  return activeRuntime;
}

/** Base URL most recently applied by `configureApiRuntime`, used to name it in connection errors. */
export function getActiveBaseUrl(): string | undefined {
  return normalizeRuntimeValue(activeRuntime?.baseUrl);
}

import type { Command } from 'commander';
import { configureApiRuntime, type ResolvedApiRuntimeConfig } from './apiRuntime';
import { CliUsageError } from './errors';
import {
  createGeneratedHagiApi,
  type HagiApi,
} from './hagiApi';

export type CliIo = {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
};

export type AppDependencies = {
  api: HagiApi;
  env: NodeJS.ProcessEnv;
  io: CliIo;
};

export type GlobalCommandOptions = {
  baseUrl?: string;
  token?: string;
  lang?: string;
  json?: boolean;
};

export type CommandContext = {
  api: HagiApi;
  env: NodeJS.ProcessEnv;
  io: CliIo;
  outputJson: boolean;
  runtime: ResolvedApiRuntimeConfig;
};

export function normalizeOptionalString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function requireOptionValue(value: string | undefined | null, label: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new CliUsageError(`${label} is required.`);
  }

  return normalized;
}

export function normalizeOptionalStringArray(values?: Array<string | null | undefined>): string[] | undefined {
  const normalized = values?.map(value => normalizeOptionalString(value)).filter(Boolean) as string[] | undefined;
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function createDefaultDependencies(
  env: NodeJS.ProcessEnv = process.env,
  io: CliIo = {
    stdout: value => {
      process.stdout.write(value);
    },
    stderr: value => {
      process.stderr.write(value);
    },
  },
): AppDependencies {
  return {
    api: createGeneratedHagiApi(),
    env,
    io,
  };
}

export function addGlobalApiOptions(command: Command): Command {
  return command
    .option('--base-url <url>', 'Backend API base URL. Defaults to HAGI_API_BASE_URL or the local dev URL.')
    .option('--token <token>', 'Bearer token for backend API calls. Overrides HAGI_API_TOKEN.')
    .option('--lang <lang>', 'Accept-Language value for backend API calls. Overrides HAGI_API_LANG.');
}

export function addJsonOption(command: Command): Command {
  return command.option('--json', 'Emit deterministic JSON instead of human-readable text.');
}

export function createCommandContext(command: Command, dependencies: AppDependencies): CommandContext {
  const options = command.optsWithGlobals<GlobalCommandOptions>();

  return {
    api: dependencies.api,
    env: dependencies.env,
    io: dependencies.io,
    outputJson: options.json === true,
    runtime: configureApiRuntime(
      {
        baseUrl: options.baseUrl,
        token: options.token,
        lang: options.lang,
      },
      dependencies.env,
    ),
  };
}

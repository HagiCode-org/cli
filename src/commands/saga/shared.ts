import type { Command } from 'commander';
import path from 'node:path';
import { resolveSagaProjectDirectory, type SagaSelector } from '../../runtime/saga/project';
import type { AppDependencies, CliIo } from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';

export type SagaSelectorOptions = {
  path?: string;
  projectId?: string;
};

export type SagaCommandContext = {
  env: NodeJS.ProcessEnv;
  io: CliIo;
  outputJson: boolean;
  projectDirectory: string;
  sagaRoot: string;
  selector: SagaSelector;
};

export function parseSagaSelector(options: SagaSelectorOptions): SagaSelector {
  const hasPath = options.path !== undefined;
  const hasProjectId = options.projectId !== undefined;
  if (hasPath === hasProjectId) {
    throw new CliUsageError('Specify exactly one of --path <directory> or --project-id <id>.');
  }
  if (hasPath) {
    const projectPath = options.path;
    if (projectPath === undefined || projectPath === '') {
      throw new CliUsageError('--path <directory> must not be empty.');
    }
    return { kind: 'path', value: projectPath };
  }

  const projectId = options.projectId?.trim();
  if (!projectId) {
    throw new CliUsageError('--project-id <id> must not be empty.');
  }
  return { kind: 'project-id', value: projectId };
}

/**
 * Execution token of a mutating Saga command: `--token`, else `SAGA_EXECUTION_TOKEN`. With `--project-id` the root
 * `--token` is the backend bearer token, so it is rejected there and only the environment variable is used.
 */
export function resolveExecutionToken(command: Command, env: NodeJS.ProcessEnv): string | undefined {
  const flagToken = command.opts<{ token?: string }>().token ?? command.optsWithGlobals<{ token?: string }>().token;
  const projectId = command.optsWithGlobals<SagaSelectorOptions>().projectId;
  if (projectId !== undefined && flagToken !== undefined) {
    throw new CliUsageError(
      '--token is the backend bearer token with --project-id; set SAGA_EXECUTION_TOKEN to pass the execution token.',
    );
  }
  if (flagToken !== undefined && flagToken !== '') {
    return flagToken;
  }
  return env.SAGA_EXECUTION_TOKEN || undefined;
}

export async function resolveSagaCommandContext(
  command: Command,
  dependencies: AppDependencies,
): Promise<SagaCommandContext> {
  const options = command.optsWithGlobals<SagaSelectorOptions & { json?: boolean }>();
  const selector = parseSagaSelector(options);
  const projectDirectory = await resolveSagaProjectDirectory(selector, command, dependencies);
  return {
    env: dependencies.env,
    io: dependencies.io,
    outputJson: options.json === true,
    projectDirectory,
    sagaRoot: path.join(projectDirectory, '.hagicode', 'sagas'),
    selector,
  };
}

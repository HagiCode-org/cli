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

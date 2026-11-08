import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import type { AppDependencies } from '../commandContext';
import { createCommandContext } from '../commandContext';
import { CliHttpError, CliOperationFailedError } from '../errors';

export type SagaSelector =
  | { kind: 'path'; value: string }
  | { kind: 'project-id'; value: string };

export function resolveLocalSagaProjectPath(rawPath: string): string {
  const absolutePath = path.resolve(rawPath);
  let projectPath: string;
  try {
    projectPath = realpathSync(absolutePath);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliOperationFailedError(`Cannot use local project path "${rawPath}": ${reason}`);
  }

  if (!statSync(projectPath).isDirectory()) {
    throw new CliOperationFailedError(`Local project path is not a directory: "${rawPath}"`);
  }
  return projectPath;
}

export async function resolveSagaProjectDirectory(
  selector: SagaSelector,
  command: Command,
  dependencies: AppDependencies,
): Promise<string> {
  if (selector.kind === 'path') {
    return resolveLocalSagaProjectPath(selector.value);
  }

  const context = createCommandContext(command, dependencies);
  const response = await context.api.listProjects();
  if (!Array.isArray(response.projects)) {
    throw new CliOperationFailedError('Backend project list did not include a projects collection.');
  }
  const project = response.projects.find(candidate => candidate.id === selector.value);
  if (!project) {
    throw new CliHttpError(404, `Project "${selector.value}" was not found.`);
  }
  if (typeof project.path !== 'string' || project.path.length === 0) {
    throw new CliOperationFailedError(`Backend project "${selector.value}" has no host-local project path.`);
  }
  return resolveLocalSagaProjectPath(project.path);
}

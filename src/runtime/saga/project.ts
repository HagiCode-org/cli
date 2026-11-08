import { realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import type { AppDependencies } from '../commandContext';
import { createCommandContext } from '../commandContext';
import { CliHttpError, CliOperationFailedError, CliSagaRefusalError } from '../errors';

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

/** A registered backend project as the Saga commands read it; only the fields used for matching. */
export type RegisteredProject = { id?: string; path?: string | null };

/** A selector resolved to the backend project ID and the real project directory on this host. */
export type SagaProjectIdentity = { projectId: string; projectDirectory: string };

type ProjectListing = { projects?: readonly RegisteredProject[] | null };

function registeredProjects(response: ProjectListing): readonly RegisteredProject[] {
  if (!Array.isArray(response.projects)) {
    throw new CliOperationFailedError('Backend project list did not include a projects collection.');
  }
  return response.projects;
}

function projectDirectoryOfProject(project: RegisteredProject, projectId: string): string {
  if (typeof project.path !== 'string' || project.path.length === 0) {
    throw new CliOperationFailedError(`Backend project "${projectId}" has no host-local project path.`);
  }
  return resolveLocalSagaProjectPath(project.path);
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
  const projects = registeredProjects(await context.api.listProjects());
  const project = projects.find(candidate => candidate.id === selector.value);
  if (!project) {
    throw new CliHttpError(404, `Project "${selector.value}" was not found.`);
  }
  return projectDirectoryOfProject(project, selector.value);
}

/** Real-path comparison; Windows paths compare case-insensitively, as `safeWrite` does. */
function samePath(left: string, right: string): boolean {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/** The real path of a registered project's path, or undefined when that path does not exist on this host. */
function realPathIfPresent(candidate: string): string | undefined {
  try {
    return realpathSync(path.resolve(candidate));
  } catch {
    return undefined;
  }
}

/**
 * Picks the one registered project whose real path equals `projectDirectory` (already a real path). Projects whose path
 * is missing on this host are skipped. Zero matches, or several, is a refusal that lists the IDs and changes nothing.
 */
export function matchProjectByPath(projects: readonly RegisteredProject[], projectDirectory: string): SagaProjectIdentity {
  const matches = projects.flatMap(project => {
    if (typeof project.id !== 'string' || typeof project.path !== 'string' || project.path.length === 0) {
      return [];
    }
    const real = realPathIfPresent(project.path);
    return real !== undefined && samePath(real, projectDirectory) ? [{ id: project.id }] : [];
  });

  if (matches.length === 0) {
    throw new CliSagaRefusalError([`no registered project has the path ${projectDirectory}; register the project or pass --project-id.`]);
  }
  if (matches.length > 1) {
    const ids = matches.map(match => match.id).join(', ');
    throw new CliSagaRefusalError([
      `${matches.length} registered projects have the path ${projectDirectory} (${ids}); pass --project-id to choose one.`,
    ]);
  }
  return { projectId: matches[0].id, projectDirectory };
}

/**
 * Resolves a selector to the backend project ID and the real project directory. `--project-id` keeps its lookup; `--path`
 * lists the registered projects and matches by real path. Both call `listProjects` once, through the given lister.
 */
export async function resolveSagaProjectIdentity(
  selector: SagaSelector,
  listProjects: () => Promise<ProjectListing>,
): Promise<SagaProjectIdentity> {
  if (selector.kind === 'path') {
    const projectDirectory = resolveLocalSagaProjectPath(selector.value);
    return matchProjectByPath(registeredProjects(await listProjects()), projectDirectory);
  }

  const project = registeredProjects(await listProjects()).find(candidate => candidate.id === selector.value);
  if (!project) {
    throw new CliHttpError(404, `Project "${selector.value}" was not found.`);
  }
  return { projectId: selector.value, projectDirectory: projectDirectoryOfProject(project, selector.value) };
}

import { spawnSync } from 'node:child_process';
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { CliOperationFailedError, CliUsageError } from '../errors';
import type { SagaSelector } from './project';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
const RESERVED_IDS = new Set(['prompts', 'tools', 'archive', 'runtime', 'amendments', 'revisions']);
const PROMPT_PATHS = ['goal', 'research', 'acceptance', 'plan', 'amend', 'run']
  .map(name => `prompts/${name}.md`);

function exists(target: string): boolean {
  try {
    lstatSync(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

function isDirectory(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export function validateSagaId(sagaId: string, sagaRoot: string): void {
  if (!ID_PATTERN.test(sagaId)) {
    throw new CliUsageError(
      `Invalid Saga ID ${JSON.stringify(sagaId)}: use 1-63 lowercase letters, digits, or hyphens, beginning with a letter or digit.`,
    );
  }
  if (RESERVED_IDS.has(sagaId)) {
    throw new CliUsageError(`Saga ID ${JSON.stringify(sagaId)} is reserved.`);
  }

  const activePath = path.join(sagaRoot, sagaId);
  if (exists(activePath)) {
    throw new CliOperationFailedError(`Saga "${sagaId}" already exists at ${activePath}.`);
  }

  const archivePath = path.join(sagaRoot, 'archive');
  if (isDirectory(archivePath)) {
    const archivedName = readdirSync(archivePath).find(name => name.endsWith(`-${sagaId}`));
    if (archivedName) {
      throw new CliOperationFailedError(`Saga "${sagaId}" already exists in the archive as "${archivedName}".`);
    }
  }
}

function initCommand(selector: SagaSelector): string {
  const option = selector.kind === 'path' ? '--path' : '--project-id';
  return `hagi saga init ${option} ${JSON.stringify(selector.value)}`;
}

export function requireSagaResources(sagaRoot: string, selector: SagaSelector): string {
  const projectRoot = path.dirname(path.dirname(sagaRoot));
  const directoryPaths = ['.hagicode', '.hagicode/sagas', '.hagicode/sagas/prompts', '.hagicode/sagas/tools'];
  const filePaths = [...PROMPT_PATHS, 'tools/saga.mjs', '.gitignore'];
  const missing = (resourcePath: string): never => {
    throw new CliOperationFailedError(
      `Saga resource path "${resourcePath}" is missing or unsafe. Run ${initCommand(selector)} after correcting the target.`,
    );
  };

  for (const relativePath of directoryPaths) {
    const target = path.join(projectRoot, relativePath);
    if (!exists(target)) {
      missing(relativePath);
    }
    const stat = lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      missing(relativePath);
    }
  }

  for (const relativePath of filePaths) {
    const target = path.join(sagaRoot, ...relativePath.split('/'));
    if (!exists(target)) {
      missing(relativePath);
    }
    const stat = lstatSync(target);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      missing(relativePath);
    }
  }

  const ignorePath = path.join(sagaRoot, '.gitignore');
  if (!readFileSync(ignorePath, 'utf8').split(/\r?\n/).includes('*/runtime/')) {
    missing('.gitignore (runtime ignore rule)');
  }

  return path.join(sagaRoot, 'tools', 'saga.mjs');
}

export type SagaMetadata = {
  id: string;
  createdAt: string;
  method: 1;
};

function isSagaMetadata(value: unknown): value is SagaMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && typeof record.createdAt === 'string' && record.method === 1;
}

export function createSagaWithCanonicalTool(
  sagaId: string,
  projectDirectory: string,
  sagaRoot: string,
  toolPath: string,
  env: NodeJS.ProcessEnv,
): SagaMetadata {
  const result = spawnSync(
    process.execPath,
    [toolPath, '--root', sagaRoot, 'new', sagaId],
    {
      cwd: projectDirectory,
      env: { ...process.env, ...env, SAGA_ROOT: sagaRoot },
      encoding: 'utf8',
      shell: false,
    },
  );
  if (result.error) {
    throw new CliOperationFailedError(`Could not run the installed Saga tool: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
    const reason = output || `the process exited with code ${result.status ?? `signal ${result.signal}`}`;
    throw new CliOperationFailedError(`The Saga tool could not create "${sagaId}": ${reason}`);
  }

  const metadataPath = path.join(sagaRoot, sagaId, 'saga.json');
  let metadata: unknown;
  try {
    metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CliOperationFailedError(`The Saga tool created invalid metadata at ${metadataPath}: ${error.message}`);
    }
    throw error;
  }

  if (!isSagaMetadata(metadata) || metadata.id !== sagaId) {
    throw new CliOperationFailedError(`The Saga tool created invalid metadata at ${metadataPath}.`);
  }
  return { id: metadata.id, createdAt: metadata.createdAt, method: metadata.method };
}

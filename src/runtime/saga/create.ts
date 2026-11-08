import { lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { CliOperationFailedError, CliUsageError } from '../errors';
import { utcTimestamp } from './contract';
import type { SagaSelector } from './project';
import { assertContained, writeFileExclusive } from './safeWrite';

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
  const directoryPaths = ['.hagicode', '.hagicode/sagas', '.hagicode/sagas/prompts'];
  const filePaths = [...PROMPT_PATHS, '.gitignore'];
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
  const ignoreLines = readFileSync(ignorePath, 'utf8').split(/\r?\n/);
  if (!ignoreLines.includes('**/runtime/') && !ignoreLines.includes('*/runtime/')) {
    missing('.gitignore (runtime ignore rule)');
  }

  return path.join(sagaRoot, 'prompts');
}

export type SagaMetadata = {
  id: string;
  createdAt: string;
  method: 1;
};

/**
 * Creates `<sagaRoot>/<sagaId>/saga.json` natively. The directory is reserved with an exclusive `mkdir`, so concurrent
 * creations of one ID leave exactly one Saga. No runtime file is written.
 */
export function createSagaNatively(sagaId: string, sagaRoot: string): SagaMetadata {
  const directory = assertContained(sagaRoot, path.join(sagaRoot, sagaId));
  try {
    mkdirSync(directory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new CliOperationFailedError(`Saga "${sagaId}" already exists at ${directory}.`);
    }
    throw error;
  }

  const metadata: SagaMetadata = { id: sagaId, createdAt: utcTimestamp(), method: 1 };
  try {
    writeFileExclusive(sagaRoot, path.join(directory, 'saga.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  } catch (error) {
    // Release the reservation so a failed creation never leaves an unreadable Saga behind.
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return metadata;
}

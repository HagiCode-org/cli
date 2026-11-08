import {
  closeSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type { SagaAssets } from './assets';
import { CliOperationFailedError } from '../errors';

const RESOURCE_DIRECTORIES = [
  '.hagicode',
  '.hagicode/sagas',
  '.hagicode/sagas/prompts',
];

function isRuntimeIgnoreRule(bytes: Buffer): boolean {
  return bytes.toString('utf8').split(/\r?\n/).includes('*/runtime/');
}

function mergeRuntimeIgnoreRule(bytes: Buffer): Buffer {
  if (isRuntimeIgnoreRule(bytes)) {
    return bytes;
  }
  const text = bytes.toString('utf8');
  const newline = text.match(/\r\n|\n/)?.[0] ?? '\n';
  const separator = bytes.length > 0 && !text.endsWith('\n') ? newline : '';
  return Buffer.concat([bytes, Buffer.from(`${separator}*/runtime/`)]);
}

function lstatIfPresent(target: string) {
  try {
    return lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function writeAtomically(target: string, bytes: Buffer, mode?: number): void {
  const temporaryPath = path.join(path.dirname(target), `.${path.basename(target)}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, 'wx', mode ?? 0o666);
    writeFileSync(descriptor, bytes);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, target);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (lstatIfPresent(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

function assertContained(root: string, target: string, actualPath: string): void {
  const relativePath = path.relative(root, actualPath);
  if (relativePath === '..' || relativePath.startsWith(`..${path.sep}`) || path.isAbsolute(relativePath)) {
    throw new CliOperationFailedError(`Saga installation path escapes the selected project: ${target}`);
  }
  const expectedPath = path.resolve(target);
  const resolvedPath = path.resolve(actualPath);
  if (process.platform === 'win32' ? expectedPath.toLowerCase() !== resolvedPath.toLowerCase() : expectedPath !== resolvedPath) {
    throw new CliOperationFailedError(`Saga installation path is redirected: ${target}`);
  }
}

export function preflightSagaInstall(projectDirectory: string, assets: SagaAssets, force = false): string {
  const projectRoot = realpathSync(projectDirectory);
  if (!statSync(projectRoot).isDirectory()) {
    throw new CliOperationFailedError(`Selected project path is not a directory: ${projectDirectory}`);
  }
  const sagaRoot = path.join(projectRoot, '.hagicode', 'sagas');

  for (const relativePath of RESOURCE_DIRECTORIES) {
    const target = path.join(projectRoot, relativePath);
    const stat = lstatIfPresent(target);
    if (!stat) {
      continue;
    }
    if (stat.isSymbolicLink()) {
      throw new CliOperationFailedError(`Refusing redirected Saga installation directory: ${target}`);
    }
    if (!stat.isDirectory()) {
      throw new CliOperationFailedError(`Saga installation path is not a directory: ${target}`);
    }
    assertContained(projectRoot, target, realpathSync(target));
  }

  for (const [assetPath, expectedBytes] of assets.files) {
    const target = path.join(sagaRoot, ...assetPath.split('/'));
    const stat = lstatIfPresent(target);
    if (!stat) {
      continue;
    }
    if (stat.isSymbolicLink()) {
      throw new CliOperationFailedError(`Refusing redirected Saga resource: ${target}`);
    }
    if (!stat.isFile()) {
      throw new CliOperationFailedError(`Saga resource is not a regular file: ${target}`);
    }
    assertContained(sagaRoot, target, realpathSync(target));

    if (stat.nlink > 1) {
      const currentBytes = readFileSync(target);
      const wouldWrite = assetPath === '.gitignore'
        ? !isRuntimeIgnoreRule(currentBytes)
        : force && !currentBytes.equals(expectedBytes);
      if (wouldWrite) {
        throw new CliOperationFailedError(`Refusing to overwrite hard-linked Saga resource: ${target}`);
      }
    }
  }

  return sagaRoot;
}

export type SagaInstallOutcome = 'created' | 'unchanged' | 'merged' | 'replaced' | 'conflict';

export type SagaInstallReport = {
  root: string;
  force: boolean;
  files: Array<{ path: string; outcome: SagaInstallOutcome }>;
  conflicts: string[];
};

export function installSagaResources(
  projectDirectory: string,
  assets: SagaAssets,
  force = false,
): SagaInstallReport {
  const sagaRoot = preflightSagaInstall(projectDirectory, assets, force);
  const projectRoot = path.dirname(path.dirname(sagaRoot));

  for (const relativePath of RESOURCE_DIRECTORIES) {
    const target = path.join(projectRoot, relativePath);
    if (!lstatIfPresent(target)) {
      mkdirSync(target);
    }
  }
  preflightSagaInstall(projectRoot, assets, force);

  const files: SagaInstallReport['files'] = [];
  const conflicts: string[] = [];
  for (const [assetPath, expectedBytes] of assets.files) {
    const target = path.join(sagaRoot, ...assetPath.split('/'));
    const stat = lstatIfPresent(target);
    if (!stat) {
      preflightSagaInstall(projectRoot, assets, force);
      writeAtomically(target, expectedBytes);
      files.push({ path: assetPath, outcome: 'created' });
      continue;
    }

    const currentBytes = readFileSync(target);
    if (assetPath === '.gitignore') {
      const mergedBytes = mergeRuntimeIgnoreRule(currentBytes);
      if (currentBytes.equals(mergedBytes)) {
        files.push({ path: assetPath, outcome: 'unchanged' });
      } else {
        preflightSagaInstall(projectRoot, assets, force);
        writeAtomically(target, mergedBytes, stat.mode & 0o777);
        files.push({ path: assetPath, outcome: 'merged' });
      }
      continue;
    }

    if (currentBytes.equals(expectedBytes)) {
      files.push({ path: assetPath, outcome: 'unchanged' });
    } else if (force) {
      preflightSagaInstall(projectRoot, assets, force);
      writeAtomically(target, expectedBytes, stat.mode & 0o777);
      files.push({ path: assetPath, outcome: 'replaced' });
    } else {
      conflicts.push(assetPath);
      files.push({ path: assetPath, outcome: 'conflict' });
    }
  }

  return { root: sagaRoot, force, files, conflicts };
}

import { randomUUID } from 'node:crypto';
import {
  appendFileSync,
  closeSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeSync,
} from 'node:fs';
import path from 'node:path';
import { CliOperationFailedError, CliSagaRefusalError } from '../errors';

/** Runtime ignore rule written when no `runtime/` rule exists yet. */
const RUNTIME_IGNORE_RULE = '**/runtime/';

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

function sameLocation(left: string, right: string): boolean {
  return process.platform === 'win32' ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/**
 * Resolves `target` and proves it stays inside `sagaRoot`: no traversal, no symbolic link or redirected ancestor on any
 * segment that already exists. Every write, rename and removal in the Saga commands goes through this check first.
 */
export function assertContained(sagaRoot: string, target: string): string {
  const root = path.resolve(sagaRoot);
  const resolved = path.resolve(target);
  const relative = path.relative(root, resolved);
  if (relative === '') {
    return resolved;
  }
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new CliSagaRefusalError([`path escapes the Saga root: ${target}`]);
  }

  const rootStat = lstatIfPresent(root);
  if (rootStat) {
    if (rootStat.isSymbolicLink() || !sameLocation(realpathSync(root), root)) {
      throw new CliSagaRefusalError([`Saga root is redirected through a link: ${root}`]);
    }
  }

  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    const stat = lstatIfPresent(current);
    if (!stat) {
      break;
    }
    if (stat.isSymbolicLink()) {
      throw new CliSagaRefusalError([`refusing a redirected Saga path: ${current}`]);
    }
  }
  return resolved;
}

export function ensureDirectory(sagaRoot: string, directory: string): void {
  const target = assertContained(sagaRoot, directory);
  try {
    mkdirSync(target, { recursive: true });
  } catch (error) {
    throw new CliOperationFailedError(`Cannot create Saga directory "${directory}": ${errorMessage(error)}`);
  }
}

/** Creates a new file; an existing file raises EEXIST for the caller to map. */
export function writeFileExclusive(sagaRoot: string, target: string, data: string | Buffer): void {
  const file = assertContained(sagaRoot, target);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(file, 'wx');
    writeSync(descriptor, toBytes(data));
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}

/** Replaces a file through a same-directory temporary file; the temporary file never survives a failure. */
export function writeFileAtomic(sagaRoot: string, target: string, data: string | Buffer): void {
  const file = assertContained(sagaRoot, target);
  const temporaryPath = path.join(path.dirname(file), `${path.basename(file)}.${randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, 'wx');
    writeSync(descriptor, toBytes(data));
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, file);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
    if (lstatIfPresent(temporaryPath)) {
      unlinkSync(temporaryPath);
    }
  }
}

export function writeJsonAtomic(sagaRoot: string, target: string, value: unknown): void {
  writeFileAtomic(sagaRoot, target, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Appends `text` to a contained file, creating the file when it is missing. Earlier bytes are never rewritten: a newline is
 * written first only when the file is non-empty and does not end with one. The target is checked by `assertContained`, so a
 * symbolic link or a redirected ancestor refuses the append before any byte is written.
 */
export function appendContained(sagaRoot: string, target: string, text: string): void {
  const file = assertContained(sagaRoot, target);
  const existing = readContainedBytes(sagaRoot, target);
  const needsSeparator = existing !== undefined && existing.length > 0 && existing[existing.length - 1] !== 0x0a;
  let descriptor: number | undefined;
  try {
    descriptor = openSync(file, 'a');
    writeSync(descriptor, toBytes(needsSeparator ? `\n${text}` : text));
  } catch (error) {
    throw new CliOperationFailedError(`Cannot append to Saga data "${target}": ${errorMessage(error)}`);
  } finally {
    if (descriptor !== undefined) {
      closeSync(descriptor);
    }
  }
}

export function removeFile(sagaRoot: string, target: string): void {
  unlinkSync(assertContained(sagaRoot, target));
}

/**
 * Publishes `source` at `target` only if `target` does not exist yet (EEXIST otherwise). Because the file is linked
 * rather than written in place, `target` is never visible with partial content.
 */
export function linkFileExclusive(sagaRoot: string, source: string, target: string): void {
  linkSync(assertContained(sagaRoot, source), assertContained(sagaRoot, target));
}

/** Moves one file inside the Saga root; the destination must not exist. */
export function moveFile(sagaRoot: string, from: string, to: string): void {
  const source = assertContained(sagaRoot, from);
  const destination = assertContained(sagaRoot, to);
  if (lstatIfPresent(destination)) {
    throw new CliSagaRefusalError([`destination already exists: ${to}`]);
  }
  renameSync(source, destination);
}

/** Bytes of a contained regular file, or undefined when it does not exist. */
export function readContainedBytes(sagaRoot: string, target: string): Buffer | undefined {
  const file = assertContained(sagaRoot, target);
  try {
    return readFileSync(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw new CliOperationFailedError(`Cannot read Saga data "${target}": ${errorMessage(error)}`);
  }
}

export function readContainedText(sagaRoot: string, target: string): string | undefined {
  return readContainedBytes(sagaRoot, target)?.toString('utf8');
}

/** Renames a directory to a destination that must not exist yet. */
export function moveDirectory(sagaRoot: string, from: string, to: string): void {
  const source = assertContained(sagaRoot, from);
  const destination = assertContained(sagaRoot, to);
  if (lstatIfPresent(destination)) {
    throw new CliSagaRefusalError([`destination already exists: ${to}`]);
  }
  renameSync(source, destination);
}

function isRuntimeIgnoreRule(text: string): boolean {
  const lines = text.split(/\r?\n/);
  return lines.includes(RUNTIME_IGNORE_RULE);
}

/**
 * Ensures `<sagaRoot>/.gitignore` ignores runtime directories before any runtime file is written. An existing
 * `**\/runtime/` line is left alone byte for byte; otherwise the rule is appended and the file's existing bytes and
 * line endings are preserved, so a legacy `*\/runtime/` line stays and the recursive rule is added after it. A failure stops the caller before `runtime/` is created.
 */
export function ensureRuntimeIgnore(sagaRoot: string): void {
  ensureDirectory(sagaRoot, sagaRoot);
  const ignorePath = assertContained(sagaRoot, path.join(sagaRoot, '.gitignore'));
  let existing: string | undefined;
  try {
    existing = lstatIfPresent(ignorePath) ? readFileSync(ignorePath, 'utf8') : undefined;
    if (existing !== undefined && isRuntimeIgnoreRule(existing)) {
      return;
    }
    if (existing === undefined) {
      writeFileExclusive(sagaRoot, ignorePath, `${RUNTIME_IGNORE_RULE}\n`);
      return;
    }
    const newline = existing.includes('\r\n') ? '\r\n' : '\n';
    const separator = existing.length > 0 && !existing.endsWith('\n') ? newline : '';
    appendFileSync(ignorePath, `${separator}${RUNTIME_IGNORE_RULE}${newline}`);
  } catch (error) {
    if (error instanceof CliSagaRefusalError) {
      throw error;
    }
    throw new CliOperationFailedError(
      `Cannot write the runtime ignore rule in "${ignorePath}": ${errorMessage(error)}. No runtime files were created.`,
    );
  }
}

function toBytes(data: string | Buffer): Buffer {
  return typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

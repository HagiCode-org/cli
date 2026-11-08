import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CliOperationFailedError, CliSagaRefusalError, CliUsageError } from '../errors';
import { sha256, utcTimestamp } from './contract';
import {
  assertContained,
  ensureDirectory,
  ensureRuntimeIgnore,
  linkFileExclusive,
  removeFile,
  writeFileExclusive,
} from './safeWrite';

/** Content of `runtime/execute.lock`; the format is shared with the bundled tool. */
export type ExecutionLock = {
  token: string;
  ownerSession: string;
  createdAt: string;
};

export type OwnershipState = { locked: false } | { locked: true; ownerSession: string };

function sagaDirectoryOf(sagaRoot: string, sagaId: string): string {
  return path.join(sagaRoot, sagaId);
}

function lockPathOf(sagaRoot: string, sagaId: string): string {
  return path.join(sagaDirectoryOf(sagaRoot, sagaId), 'runtime', 'execute.lock');
}

function isExecutionLock(value: unknown): value is ExecutionLock {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.token === 'string'
    && typeof record.ownerSession === 'string'
    && typeof record.createdAt === 'string';
}

/** Current execution lock, or undefined when the Saga has no owner. A damaged lock is an error, never an empty owner. */
export function readExecutionLock(sagaRoot: string, sagaId: string): ExecutionLock | undefined {
  const file = assertContained(sagaRoot, lockPathOf(sagaRoot, sagaId));
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw new CliOperationFailedError(`Cannot read the execution lock of Saga "${sagaId}": ${(error as Error).message}`);
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CliOperationFailedError(`The execution lock of Saga "${sagaId}" is not valid JSON.`);
  }
  if (!isExecutionLock(value)) {
    throw new CliOperationFailedError(`The execution lock of Saga "${sagaId}" has an unexpected shape.`);
  }
  return value;
}

/** Compares two tokens in constant time; both are hashed first so the buffers always have equal length. */
export function tokensMatch(expected: string, supplied: string | undefined): boolean {
  if (supplied === undefined || supplied === '') {
    return false;
  }
  return timingSafeEqual(Buffer.from(sha256(expected), 'hex'), Buffer.from(sha256(supplied), 'hex'));
}

function ownershipConflict(sagaId: string, ownerSession: string): string {
  return `Saga "${sagaId}" is owned by session ${ownerSession}; reconcile the prior orchestrator and its workers. `
    + 'Ownership is never taken over by age.';
}

/**
 * Creates the execution lock exclusively. A second claim is refused whatever the age of the existing lock, and the
 * refusal names the current owner so the caller can reconcile it.
 */
export function claimExecution(sagaRoot: string, sagaId: string, session: string | undefined): ExecutionLock {
  const ownerSession = session?.trim();
  if (!ownerSession) {
    throw new CliUsageError('claim requires a nonempty --session <owner-session-id>.');
  }
  ensureRuntimeIgnore(sagaRoot);
  ensureDirectory(sagaRoot, path.join(sagaDirectoryOf(sagaRoot, sagaId), 'runtime'));

  const owner: ExecutionLock = { token: randomUUID(), ownerSession, createdAt: utcTimestamp() };
  // Stage the complete record first, then publish it with an exclusive link: a competing claim sees either no lock
  // or a finished one, never a partly written file.
  const lock = lockPathOf(sagaRoot, sagaId);
  const staging = path.join(path.dirname(lock), `.execute.lock.${randomUUID()}.tmp`);
  writeFileExclusive(sagaRoot, staging, `${JSON.stringify(owner, null, 2)}\n`);
  try {
    linkFileExclusive(sagaRoot, staging, lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
    const existing = readExecutionLock(sagaRoot, sagaId);
    throw new CliSagaRefusalError([ownershipConflict(sagaId, existing?.ownerSession ?? 'unknown')]);
  } finally {
    removeFile(sagaRoot, staging);
  }
  return owner;
}

/**
 * Guard used by every mutating command. With no lock it passes, so Sagas created before ownership stay runnable.
 * With a lock the supplied token must match; a missing or different token is a refusal and changes nothing.
 */
export function assertOwner(sagaRoot: string, sagaId: string, token: string | undefined): OwnershipState {
  const lock = readExecutionLock(sagaRoot, sagaId);
  if (!lock) {
    return { locked: false };
  }
  if (!tokensMatch(lock.token, token)) {
    throw new CliSagaRefusalError([
      `${ownershipConflict(sagaId, lock.ownerSession)} Supply the execution token with --token or SAGA_EXECUTION_TOKEN.`,
    ]);
  }
  return { locked: true, ownerSession: lock.ownerSession };
}

function snapshotState(sagaRoot: string, sagaId: string): string | undefined {
  const file = assertContained(sagaRoot, path.join(sagaDirectoryOf(sagaRoot, sagaId), 'runtime', 'status.json'));
  let text: string;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
  try {
    const state = (JSON.parse(text) as { state?: unknown }).state;
    return typeof state === 'string' ? state : undefined;
  } catch {
    return undefined;
  }
}

/** Releases the lock only for its holder, after the caller confirms workers settled and a terminal snapshot exists. */
export function releaseExecution(
  sagaRoot: string,
  sagaId: string,
  options: { token: string | undefined; workersSettled: boolean },
): { ownerSession: string } {
  const lock = readExecutionLock(sagaRoot, sagaId);
  if (!lock) {
    throw new CliSagaRefusalError([`Saga "${sagaId}" has no execution lock; there is nothing to release.`]);
  }
  if (!tokensMatch(lock.token, options.token)) {
    throw new CliSagaRefusalError([`the execution token does not match the owner session ${lock.ownerSession}.`]);
  }
  if (!options.workersSettled) {
    throw new CliSagaRefusalError(['confirm that every worker has settled with --workers-settled.']);
  }
  const state = snapshotState(sagaRoot, sagaId);
  if (state !== 'paused' && state !== 'done') {
    throw new CliSagaRefusalError([
      `the stored status is ${state ?? 'missing'}; write a paused or done snapshot with set-status before releasing.`,
    ]);
  }
  removeFile(sagaRoot, lockPathOf(sagaRoot, sagaId));
  return { ownerSession: lock.ownerSession };
}

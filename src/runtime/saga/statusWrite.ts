import path from 'node:path';
import { CliSagaRefusalError, CliUsageError } from '../errors';
import { completionErrors, loadContractView, planErrors } from './check';
import { utcTimestamp } from './contract';
import { readSagaStatus, type SagaStatus } from './read';
import { ensureDirectory, ensureRuntimeIgnore, writeJsonAtomic } from './safeWrite';

export const WRITABLE_STATES = ['draft', 'planned', 'running', 'paused', 'done'] as const;
export type WritableSagaState = (typeof WRITABLE_STATES)[number];

export function isWritableState(value: unknown): value is WritableSagaState {
  return typeof value === 'string' && (WRITABLE_STATES as readonly string[]).includes(value);
}

/**
 * Writes `runtime/status.json` as a `saga-status/2` snapshot. The snapshot is the read projection with only `state`
 * and `note` replaced. `planned` and `running` need the plan check; `done` needs the completion gate. Both are
 * validated before the file is replaced, so a refusal leaves the stored snapshot untouched.
 */
export function setStatus(
  sagaRoot: string,
  sagaId: string,
  state: string | undefined,
  note: string | undefined,
): SagaStatus {
  if (!isWritableState(state)) {
    throw new CliUsageError(`--state must be one of ${WRITABLE_STATES.join(', ')}.`);
  }
  const directory = path.join(sagaRoot, sagaId);
  if (state === 'planned' || state === 'running') {
    const errors = planErrors(loadContractView(sagaRoot, sagaId));
    if (errors.length > 0) {
      throw new CliSagaRefusalError(errors);
    }
  }
  if (state === 'done') {
    const errors = completionErrors(sagaRoot, sagaId);
    if (errors.length > 0) {
      throw new CliSagaRefusalError(errors);
    }
  }

  const snapshot: SagaStatus = {
    ...readSagaStatus(sagaId, directory),
    state,
    note: note ?? '',
    updatedAt: utcTimestamp(),
  };
  ensureRuntimeIgnore(sagaRoot);
  ensureDirectory(sagaRoot, path.join(directory, 'runtime'));
  writeJsonAtomic(sagaRoot, path.join(directory, 'runtime', 'status.json'), snapshot);
  return snapshot;
}

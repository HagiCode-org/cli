import type { Command } from 'commander';
import { createCommandContext, type AppDependencies } from '../../runtime/commandContext';
import { formatJson } from '../../formatters/json';
import { formatSagaRefusalExtras, formatSagaRefusalHuman, formatSagaWriteHuman } from '../../formatters/saga';
import { CliSagaRefusalError, CliUsageError } from '../../runtime/errors';
import { checkRun, type CheckPhase } from '../../runtime/saga/check';
import { freezeContract } from '../../runtime/saga/freeze';
import { amendSaga, archiveSaga, blockItem, tickItem } from '../../runtime/saga/mutate';
import { isWritableState, setStatus, WRITABLE_STATES } from '../../runtime/saga/statusWrite';
import { assertOwner, claimExecution, releaseExecution } from '../../runtime/saga/ownership';
import { requireSagaDirectory } from '../../runtime/saga/read';
import { resolveExecutionToken, resolveSagaCommandContext } from './shared';

export type SagaWriteRequest = {
  sagaId: string;
  sagaRoot: string;
  /** Execution token from `--token` or `SAGA_EXECUTION_TOKEN`; undefined for commands that do not take one. */
  token: string | undefined;
  /** The running command, for operations that also reach the backend. */
  command: Command;
};

export type SagaWriteSpec = {
  /** Command name written to the `command` field of every result. */
  name: string;
  /** Whether the command reads an execution token. */
  takesToken: boolean;
  /** Mutating commands: the execution token must match whenever a lock exists, before the operation runs. */
  guard?: boolean;
  /** Usage checks that run before any backend access or file access. */
  preflight?: (options: Record<string, unknown>) => void;
  /** Performs the operation; refusals are thrown as CliSagaRefusalError and reported by the handler. */
  run: (
    request: SagaWriteRequest,
    options: Record<string, unknown>,
    positionals: string[],
  ) => Record<string, unknown> | Promise<Record<string, unknown>>;
};

/**
 * Shared action for every Saga write and check command: selector and token resolution first, then the Saga lookup,
 * then the operation. A refusal prints the outcome and reasons (human or `--json`) and exits 1 without changing files.
 */
export function sagaWriteAction(dependencies: AppDependencies, spec: SagaWriteSpec) {
  return async function sagaWriteCommand(this: Command, ...args: unknown[]): Promise<void> {
    // Commander passes the positional arguments, then the options object, then the command itself.
    const positionals = args.slice(0, -2).map(String);
    const options = this.opts<Record<string, unknown>>();
    spec.preflight?.(options);

    const token = spec.takesToken ? resolveExecutionToken(this, dependencies.env) : undefined;
    const context = await resolveSagaCommandContext(this, dependencies);
    const sagaId = positionals[0];
    if (!sagaId) {
      throw new CliUsageError(`${spec.name} requires a Saga ID.`);
    }
    requireSagaDirectory(context.sagaRoot, sagaId);

    const emit = (text: string) => context.io.stdout(text);
    try {
      if (spec.guard) {
        assertOwner(context.sagaRoot, sagaId, token);
      }
      const details = await spec.run({ sagaId, sagaRoot: context.sagaRoot, token, command: this }, options, positionals);
      const result = { sagaId, command: spec.name, ok: true, ...details };
      emit(context.outputJson ? formatJson(result) : formatSagaWriteHuman(spec.name, result));
    } catch (error) {
      if (error instanceof CliSagaRefusalError) {
        const result = { sagaId, command: spec.name, ok: false, errors: error.reasons, ...error.details };
        emit(context.outputJson
          ? formatJson(result)
          : formatSagaRefusalHuman(spec.name, sagaId, error.reasons) + formatSagaRefusalExtras(error.details));
        error.reported = true;
      }
      throw error;
    }
  };
}

function requireSession(options: Record<string, unknown>): void {
  if (typeof options.session !== 'string' || options.session.trim() === '') {
    throw new CliUsageError('claim requires a nonempty --session <owner-session-id>.');
  }
}

/** How long the claim waits for the backend to mark the owner session before it reports the mark as not done. */
export const MASTER_MARK_TIMEOUT_MS = 10_000;

export type MasterMark = { sessionId: string; marked: true } | { sessionId: string; marked: false; reason: string };

/**
 * Marks the owner session as the Saga's orchestrator: adds `saga.id` and `saga.role=master` to its user metadata, so the
 * session lists show it inside the Saga's group. The lock is already taken, so a failure (an owner id that is not a
 * HagiCode session, an unreachable backend, a session that already names another Saga) is reported, never fatal.
 */
async function markMasterSession(
  command: Command,
  dependencies: AppDependencies,
  sagaId: string,
  sessionId: string,
): Promise<MasterMark> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { api } = createCommandContext(command, dependencies);
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`no answer within ${MASTER_MARK_TIMEOUT_MS / 1000} s`)), MASTER_MARK_TIMEOUT_MS);
    });
    await Promise.race([api.addSessionUserMetadata(sessionId, { 'saga.id': sagaId, 'saga.role': 'master' }), timeout]);
    return { sessionId, marked: true };
  } catch (error) {
    return { sessionId, marked: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export function claimSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'claim',
    takesToken: false,
    preflight: requireSession,
    run: async ({ sagaId, sagaRoot, command }, options) => {
      const owner = claimExecution(sagaRoot, sagaId, options.session as string);
      const master: MasterMark = options.markSession === false
        ? { sessionId: owner.ownerSession, marked: false, reason: 'skipped by --no-mark-session' }
        : await markMasterSession(command, dependencies, sagaId, owner.ownerSession);
      return { ownerSession: owner.ownerSession, token: owner.token, createdAt: owner.createdAt, master };
    },
  });
}

export function assertSagaOwner(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'assert-owner',
    takesToken: true,
    run: ({ sagaId, sagaRoot, token }) => {
      const state = assertOwner(sagaRoot, sagaId, token);
      return state.locked ? { locked: true, ownerSession: state.ownerSession } : { locked: false };
    },
  });
}

export function freezeSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'freeze',
    takesToken: true,
    guard: true,
    run: ({ sagaId, sagaRoot }) => {
      const outcome = freezeContract(sagaRoot, sagaId);
      return {
        revision: outcome.revision,
        previousRevision: outcome.previousRevision ?? null,
        unchanged: outcome.unchanged,
        reopened: outcome.reopened,
        added: outcome.added,
      };
    },
  });
}

export function checkSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'check',
    takesToken: false,
    preflight: options => {
      if (options.phase !== 'plan' && options.phase !== 'run') {
        throw new CliUsageError('check --phase must be plan or run.');
      }
    },
    run: ({ sagaId, sagaRoot }, options) => {
      const phase = options.phase as CheckPhase;
      const { errors, methods } = checkRun(sagaRoot, sagaId, phase);
      const details = methods === undefined ? {} : { methods };
      if (errors.length > 0) {
        throw new CliSagaRefusalError(errors, { details });
      }
      return { phase, errors: [], ...details };
    },
  });
}

export function tickSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'tick',
    takesToken: true,
    guard: true,
    run: ({ sagaId, sagaRoot }, _options, positionals) => ({ ...tickItem(sagaRoot, sagaId, positionals[1]) }),
  });
}

export function blockSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'block',
    takesToken: true,
    guard: true,
    run: ({ sagaId, sagaRoot }, _options, positionals) => ({ ...blockItem(sagaRoot, sagaId, positionals[1], positionals[2]) }),
  });
}

export function amendSagaCommand(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'amend',
    takesToken: true,
    guard: true,
    run: ({ sagaId, sagaRoot }, _options, positionals) => {
      const amendment = amendSaga(sagaRoot, sagaId, positionals[1], positionals[2] ?? '');
      return { name: amendment.name, merged: false };
    },
  });
}

export function archiveSagaCommand(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'archive',
    takesToken: true,
    guard: true,
    run: ({ sagaId, sagaRoot }, options) => ({ ...archiveSaga(sagaRoot, sagaId, options.force === true) }),
  });
}

export function setStatusSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'set-status',
    takesToken: true,
    guard: true,
    preflight: options => {
      if (!isWritableState(options.state)) {
        throw new CliUsageError(`--state must be one of ${WRITABLE_STATES.join(', ')}.`);
      }
    },
    run: ({ sagaId, sagaRoot }, options) => {
      const snapshot = setStatus(sagaRoot, sagaId, options.state as string, options.note as string | undefined);
      return { ...snapshot };
    },
  });
}

export function releaseSaga(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'release',
    takesToken: true,
    run: ({ sagaId, sagaRoot, token }, options) => {
      const released = releaseExecution(sagaRoot, sagaId, {
        token,
        workersSettled: options.workersSettled === true,
      });
      return { released: true, ownerSession: released.ownerSession };
    },
  });
}

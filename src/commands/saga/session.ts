import type { Command } from 'commander';
import path from 'node:path';
import { formatJson } from '../../formatters/json';
import { formatSagaRefusalHuman, formatSagaSessionCreateHuman } from '../../formatters/saga';
import { toSessionView } from '../../formatters/session';
import { createCommandContext, type AppDependencies } from '../../runtime/commandContext';
import { CliSagaRefusalError, CliUsageError } from '../../runtime/errors';
import { parseHeroReference, type HeroReference } from '../../runtime/heroReference';
import { assertOwner } from '../../runtime/saga/ownership';
import { resolveSagaProjectIdentity, type SagaSelector } from '../../runtime/saga/project';
import { requireSagaDirectory } from '../../runtime/saga/read';
import { appendContained, assertContained, ensureDirectory, ensureRuntimeIgnore } from '../../runtime/saga/safeWrite';
import {
  buildWorkerMetadata,
  formatSessionRecordLine,
  WORKER_ROLES,
  type WorkerRole,
} from '../../runtime/saga/sessionRecord';
import { parseSagaSelector, type SagaSelectorOptions } from './shared';

/** Value of the `command` field of every result of this command. */
export const SESSION_CREATE_COMMAND = 'session create';

export type SessionCreateOptions = SagaSelectorOptions & {
  saga?: string;
  title?: string;
  role?: string;
  master?: string;
  item?: string;
  hero?: string;
  token?: string;
  json?: boolean;
};

/** Arguments that passed every usage check; nothing has been sent or read yet. */
export type SessionCreateRequest = {
  sagaId: string;
  title: string;
  role: WorkerRole;
  masterSessionId: string;
  item: string | undefined;
  /** The Hero the Worker runs, when --hero is given. Only the chat creation request carries it, never the metadata or the record. */
  hero: HeroReference | undefined;
  executionToken: string;
  selector: SagaSelector;
};

const PATH_SEPARATOR = /[\\/]/;

function requireNonBlank(value: unknown, flag: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new CliUsageError(`session create requires a nonblank ${flag} <value>.`);
  }
  return value.trim();
}

/** A Saga or item identifier must not carry a path separator or a traversal segment; it is refused before any file access. */
function requirePathSafe(value: string, flag: string): string {
  if (PATH_SEPARATOR.test(value) || value === '.' || value === '..' || value.includes('\0')) {
    throw new CliUsageError(`${flag} must not contain a path separator or a traversal segment: ${JSON.stringify(value)}.`);
  }
  return value;
}

function requireRole(value: unknown): WorkerRole {
  if (typeof value !== 'string' || !(WORKER_ROLES as readonly string[]).includes(value)) {
    throw new CliUsageError(`--role must be one of ${WORKER_ROLES.join(', ')}.`);
  }
  return value as WorkerRole;
}

/**
 * Every usage check, run before the backend is called or any file is read. `--token` is refused with either selector,
 * because the root `--token` is the backend bearer token and the execution token must never be sent as one.
 */
export function preflightSessionCreate(options: SessionCreateOptions, env: NodeJS.ProcessEnv): SessionCreateRequest {
  const sagaId = requirePathSafe(requireNonBlank(options.saga, '--saga'), '--saga');
  const title = requireNonBlank(options.title, '--title');
  const role = requireRole(options.role);
  const masterSessionId = requireNonBlank(options.master, '--master');
  const item = options.item === undefined ? undefined : requirePathSafe(requireNonBlank(options.item, '--item'), '--item');
  const hero = options.hero === undefined ? undefined : parseHeroReference(options.hero, '--hero');

  if (options.token !== undefined) {
    throw new CliUsageError(
      '--token is the backend bearer token; the Saga execution token comes only from SAGA_EXECUTION_TOKEN.',
    );
  }
  const executionToken = env.SAGA_EXECUTION_TOKEN;
  if (executionToken === undefined || executionToken.trim() === '') {
    throw new CliUsageError('session create requires SAGA_EXECUTION_TOKEN to hold the execution token claimed for this Saga.');
  }

  return {
    sagaId,
    title,
    role,
    masterSessionId,
    item,
    hero,
    executionToken,
    selector: parseSagaSelector(options),
  };
}

/**
 * Checks that `sessions.md` can be written inside the Saga data directory, and creates `runtime/` with its ignore rule.
 * Runs before the chat session exists, so an unsafe path never leaves an unrecorded session.
 */
function prepareRecordTarget(sagaRoot: string, sagaId: string): string {
  const runtimeDirectory = path.join(sagaRoot, sagaId, 'runtime');
  const recordPath = path.join(runtimeDirectory, 'sessions.md');
  assertContained(sagaRoot, recordPath);
  ensureRuntimeIgnore(sagaRoot);
  ensureDirectory(sagaRoot, runtimeDirectory);
  return recordPath;
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * `hagi saga session create`: validates every argument, resolves the project, asserts ownership, creates the chat session
 * with its `saga.*` metadata and appends one record line. Refusals print their reasons (human or `--json`) and exit 1; a
 * failed append after creation names the created session ID.
 */
export function createSagaSessionAction(dependencies: AppDependencies) {
  return async function sagaSessionCreateAction(this: Command): Promise<void> {
    const request = preflightSessionCreate(this.optsWithGlobals<SessionCreateOptions>(), dependencies.env);
    const context = createCommandContext(this, dependencies);
    const emit = (text: string) => context.io.stdout(text);
    const { sagaId } = request;

    try {
      const identity = await resolveSagaProjectIdentity(request.selector, () => context.api.listProjects());
      const sagaRoot = path.join(identity.projectDirectory, '.hagicode', 'sagas');
      requireSagaDirectory(sagaRoot, sagaId);
      assertOwner(sagaRoot, sagaId, request.executionToken);
      const recordPath = prepareRecordTarget(sagaRoot, sagaId);

      const session = await context.api.createChatSession({
        title: request.title,
        projectId: identity.projectId,
        metadata: buildWorkerMetadata({
          sagaId,
          role: request.role,
          masterSessionId: request.masterSessionId,
          item: request.item,
        }),
        // Without --hero this spreads nothing, so the request is the same as before the option existed.
        ...request.hero,
      });
      const view = toSessionView(session);

      try {
        appendContained(
          sagaRoot,
          recordPath,
          formatSessionRecordLine({
            sessionId: view.sessionId,
            role: request.role,
            item: request.item,
            title: request.title,
          }),
        );
      } catch (error) {
        const reason = `session ${view.sessionId} was created but its record could not be written to ${recordPath}: ${errorText(error)}`;
        const failed = { sagaId, command: SESSION_CREATE_COMMAND, ok: false, errors: [reason], session: view };
        emit(context.outputJson ? formatJson(failed) : formatSagaRefusalHuman(SESSION_CREATE_COMMAND, sagaId, [reason]));
        throw new CliSagaRefusalError([reason], { reported: true });
      }

      const result = { sagaId, command: SESSION_CREATE_COMMAND, ok: true, session: view, record: recordPath };
      emit(context.outputJson ? formatJson(result) : formatSagaSessionCreateHuman(result));
    } catch (error) {
      if (error instanceof CliSagaRefusalError && !error.reported) {
        const refusal = { sagaId, command: SESSION_CREATE_COMMAND, ok: false, errors: error.reasons };
        emit(context.outputJson
          ? formatJson(refusal)
          : formatSagaRefusalHuman(SESSION_CREATE_COMMAND, sagaId, error.reasons));
        error.reported = true;
      }
      throw error;
    }
  };
}

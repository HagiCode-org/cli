import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import { formatWorkerRecordsHuman } from '../../formatters/saga';
import { type AppDependencies } from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { appendOrchestratorLogEntry, readWorkerRecords } from '../../runtime/saga/runRecords';
import { resolveSagaCommandContext } from './shared';
import { sagaWriteAction } from './write';

/** Value of the `command` field of `saga session list` results. */
export const SESSION_LIST_COMMAND = 'session list';

/** `saga session list <saga-id>`: read-only; lists the Worker records of `runtime/sessions.md`. */
export function listWorkerSessions(dependencies: AppDependencies) {
  return async function sagaSessionListAction(this: Command, sagaId: string): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    const payload = { sagaId, command: SESSION_LIST_COMMAND, ok: true, sessions: readWorkerRecords(context.sagaRoot, sagaId) };
    context.io.stdout(context.outputJson ? formatJson(payload) : formatWorkerRecordsHuman(payload));
  };
}

/**
 * `saga log append <saga-id> --message <text>`: a write under the execution token, like the other Saga writes. The usage
 * check runs before the token check and before any file access.
 */
export function appendOrchestratorLog(dependencies: AppDependencies) {
  return sagaWriteAction(dependencies, {
    name: 'log append',
    takesToken: true,
    guard: true,
    preflight: options => {
      if (typeof options.message !== 'string' || options.message.trim() === '') {
        throw new CliUsageError('log append requires a nonblank --message <text>.');
      }
    },
    run: ({ sagaId, sagaRoot }, options) => ({ ...appendOrchestratorLogEntry(sagaRoot, sagaId, String(options.message)) }),
  });
}

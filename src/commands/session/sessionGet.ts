import { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatSessionSummaryHuman,
  formatSessionWaitLine,
  formatWaitNoQuestionLine,
  formatWaitQuestionPointer,
  toSessionView,
} from '../../formatters/session';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  sleepForMilliseconds,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError, CliWaitTimeoutError } from '../../runtime/errors';
import type { HagiApi } from '../../runtime/hagiApi';
import {
  findPendingQuestion,
  summarizePendingQuestion,
  type PendingQuestionSummary,
} from '../../runtime/questionAnswers';
import {
  DEFAULT_WAIT_GRACE_SECONDS,
  DEFAULT_WAIT_INTERVAL_SECONDS,
  DEFAULT_WAIT_TIMEOUT_SECONDS,
  waitForSettledSession,
  type SessionWaitOptions,
} from '../../runtime/sessionWait';

/** The status a session shows while a person has to answer. It is stable, so `--wait` settles on it. */
const WAITING_FOR_REPLY = 'WaitingForReply';

/**
 * One read of the newest messages, taken only when `--wait` settled at WaitingForReply. A failed read returns undefined and
 * never fails the wait: the output then says that no pending question was found.
 */
async function readPendingQuestionSummary(
  api: Pick<HagiApi, 'getSessionMessages'>,
  sessionId: string,
): Promise<PendingQuestionSummary | undefined> {
  try {
    const list = await api.getSessionMessages(sessionId, { page: 1, order: 'desc' });
    const pending = findPendingQuestion(list.messages);
    return pending ? summarizePendingQuestion(pending) : undefined;
  } catch {
    return undefined;
  }
}

/** Raw options of `proposal get` and `hagitask get`, as commander hands them over. */
export type SessionGetOptions = {
  sessionId: string;
  wait?: boolean;
  timeout?: string;
  interval?: string;
  grace?: string;
  json?: boolean;
};

function parseWholeSeconds(raw: string, flag: string, minimum: number): number {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new CliUsageError(`${flag} must be a whole number of seconds.`);
  }

  const value = Number(trimmed);
  if (value < minimum) {
    throw new CliUsageError(`${flag} must be ${minimum} second${minimum === 1 ? '' : 's'} or more.`);
  }

  return value;
}

/**
 * Checks the wait options before any network call. Without `--wait`, the wait-only options are rejected; with it,
 * the defaults fill the rest and `--interval` must be less than `--timeout`.
 */
export function parseSessionWaitOptions(options: SessionGetOptions): SessionWaitOptions | undefined {
  const waitOnly = [
    ['--timeout', options.timeout],
    ['--interval', options.interval],
    ['--grace', options.grace],
  ].filter(([, value]) => value !== undefined).map(([flag]) => flag);

  if (!options.wait) {
    if (waitOnly.length > 0) {
      throw new CliUsageError(`${waitOnly.join(', ')} needs --wait.`);
    }

    return undefined;
  }

  const timeoutSeconds = options.timeout === undefined
    ? DEFAULT_WAIT_TIMEOUT_SECONDS
    : parseWholeSeconds(options.timeout, '--timeout', 1);
  const intervalSeconds = options.interval === undefined
    ? DEFAULT_WAIT_INTERVAL_SECONDS
    : parseWholeSeconds(options.interval, '--interval', 1);
  const graceSeconds = options.grace === undefined
    ? DEFAULT_WAIT_GRACE_SECONDS
    : parseWholeSeconds(options.grace, '--grace', 0);

  if (intervalSeconds >= timeoutSeconds) {
    throw new CliUsageError('--interval must be less than --timeout.');
  }

  return { intervalSeconds, timeoutSeconds, graceSeconds };
}

/**
 * Registers a `get` command that reads one session by id. `label` names the session kind in messages.
 * The command does not check the session type, like `proposal status`; the output includes `type` so a wrong id shows.
 */
export function registerSessionGetCommand(
  parent: Command,
  dependencies: AppDependencies,
  options: { description: string; label: string; command: 'proposal' | 'hagitask' },
): void {
  addJsonOption(
    parent
      .command('get')
      .description(options.description),
  )
    .requiredOption('--session-id <id>', 'Session id to read.')
    .option('--wait', 'Poll until the status settles: not Optimizing, Openspecing, Executing or Archiving. WaitingForReply counts as settled.')
    .option('--timeout <seconds>', `With --wait: stop waiting after this many seconds (default ${DEFAULT_WAIT_TIMEOUT_SECONDS}). Exit code 31 on timeout.`)
    .option('--interval <seconds>', `With --wait: seconds between reads (default ${DEFAULT_WAIT_INTERVAL_SECONDS}). Must be less than --timeout.`)
    .option('--grace <seconds>', `With --wait: keep polling a stable status that never transitioned for this long (default ${DEFAULT_WAIT_GRACE_SECONDS}, 0 disables).`)
    .action(async function sessionGetAction(this: Command, rawOptions: SessionGetOptions) {
      const waitOptions = parseSessionWaitOptions(rawOptions);
      const sessionId = requireOptionValue(rawOptions.sessionId, '--session-id');
      const context = createCommandContext(this, dependencies);

      if (!waitOptions) {
        const view = toSessionView(await context.api.getSession(sessionId));
        if (context.outputJson) {
          context.io.stdout(formatJson({ session: view }));
          return;
        }

        context.io.stdout(formatSessionSummaryHuman(view));
        return;
      }

      const waited = await waitForSettledSession(
        () => context.api.getSession(sessionId),
        waitOptions,
        { now: dependencies.now ?? Date.now, sleep: dependencies.sleep ?? sleepForMilliseconds },
      );
      const view = toSessionView(waited.session);
      const wait = {
        settled: waited.settled,
        timedOut: waited.timedOut,
        transitionSeen: waited.transitionSeen,
        polls: waited.polls,
        elapsedSeconds: waited.elapsedSeconds,
      };

      // At WaitingForReply, the pending question is read once more. Only that status adds the pointer and `pendingQuestion`.
      const awaitingReply = waited.settled && view.status === WAITING_FOR_REPLY;
      const pendingQuestion = awaitingReply
        ? await readPendingQuestionSummary(context.api, sessionId)
        : undefined;

      // The result is printed before a timeout is raised, so a script and a person both see the last status.
      if (context.outputJson) {
        context.io.stdout(formatJson({ session: view, wait: pendingQuestion ? { ...wait, pendingQuestion } : wait }));
      } else {
        const pointer = awaitingReply
          ? (pendingQuestion
            ? formatWaitQuestionPointer({ command: options.command, sessionId, summary: pendingQuestion })
            : formatWaitNoQuestionLine(options.command, sessionId))
          : '';
        context.io.stdout(`${formatSessionSummaryHuman(view)}${formatSessionWaitLine(wait, view.status)}${pointer}`);
      }

      if (waited.timedOut) {
        throw new CliWaitTimeoutError(
          `Timed out after ${waited.elapsedSeconds}s waiting for ${options.label} ${sessionId} to settle; last status ${view.status}.`,
        );
      }
    });
}

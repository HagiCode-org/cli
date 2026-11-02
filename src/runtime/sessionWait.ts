/**
 * Statuses that mean the backend is still working on a run. Anything else is a stable status.
 * WaitingForReply is stable on purpose: it needs a person, so waiting longer cannot help.
 */
export const TRANSIENT_SESSION_STATUSES: ReadonlySet<string> = new Set([
  'Optimizing',
  'Openspecing',
  'Executing',
  'Archiving',
]);

export const DEFAULT_WAIT_INTERVAL_SECONDS = 5;
export const DEFAULT_WAIT_TIMEOUT_SECONDS = 900;
/**
 * Grace window for a stable first status. Verified in repos/hagicode-core: a new session starts at `Init` (a stable
 * status), and the proposal start commands only enqueue their stage prompts (`ProposalSessionGrain.GenerateProposalAsync`
 * adds them to PendingMessages and returns), so a transient status can appear after the command has returned. Ten
 * seconds covers that gap. Live confirmation of the HagiTask path is in tasks.md 7.3.
 */
export const DEFAULT_WAIT_GRACE_SECONDS = 10;

export type SessionWaitOptions = {
  intervalSeconds: number;
  timeoutSeconds: number;
  /** Seconds to keep polling a stable status that was never seen transitioning. `0` disables the window. */
  graceSeconds: number;
};

export type SessionWaitClock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
};

export type SessionWaitResult<T> = {
  session: T;
  settled: boolean;
  timedOut: boolean;
  transitionSeen: boolean;
  polls: number;
  elapsedSeconds: number;
};

export function isTransientSessionStatus(status: string): boolean {
  return TRANSIENT_SESSION_STATUSES.has(status);
}

/**
 * Reads a session until its status settles, the timeout passes, or a read fails.
 *
 * - A transient status (Optimizing, Openspecing, Executing, Archiving) keeps the wait going.
 * - Any other status settles the wait, but a stable status that was never seen transitioning keeps polling until the
 *   grace window has passed, so a run that starts a moment after its start command is not reported as already finished.
 * - When the timeout passes first, the wait returns `timedOut` with the last session it read.
 * - A read error is not caught here; the caller maps it to an exit code.
 */
export async function waitForSettledSession<T extends { status: string }>(
  read: () => Promise<T>,
  options: SessionWaitOptions,
  clock: SessionWaitClock,
): Promise<SessionWaitResult<T>> {
  const startedAt = clock.now();
  const timeoutMs = options.timeoutSeconds * 1000;
  const graceMs = options.graceSeconds * 1000;
  const intervalMs = options.intervalSeconds * 1000;
  let polls = 0;
  let transitionSeen = false;

  for (;;) {
    const session = await read();
    polls += 1;
    const elapsedMs = clock.now() - startedAt;
    const transient = isTransientSessionStatus(session.status);
    transitionSeen = transitionSeen || transient;

    const graceOver = elapsedMs >= graceMs || elapsedMs >= timeoutMs;
    if (!transient && (transitionSeen || graceOver)) {
      return result(session, { settled: true, timedOut: false });
    }

    if (elapsedMs >= timeoutMs) {
      return result(session, { settled: false, timedOut: true });
    }

    // Sleep one interval, but never past the timeout, so the last read lands on the boundary.
    await clock.sleep(Math.min(intervalMs, timeoutMs - elapsedMs));
  }

  function result(session: T, outcome: { settled: boolean; timedOut: boolean }): SessionWaitResult<T> {
    return {
      session,
      ...outcome,
      transitionSeen,
      polls,
      elapsedSeconds: Math.round((clock.now() - startedAt) / 100) / 10,
    };
  }
}

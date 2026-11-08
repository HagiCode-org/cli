import type { TokenMonitorLimitWindow, TokenMonitorUsageSnapshot } from './hagiApi';

/** Windows up to this many minutes are short. Only short windows hold a wait; a weekly window is reported but never waited on. */
export const SHORT_WINDOW_MAX_MINUTES = 360;
export const DEFAULT_MAX_WAIT_SECONDS = 1800;
export const MAX_WAIT_LIMIT_SECONDS = 21600;
export const DEFAULT_JITTER_SECONDS = 120;
export const MAX_JITTER_LIMIT_SECONDS = 3600;
/** Re-read at least this often while waiting: a reset can show up earlier than announced. */
export const WAIT_REFRESH_SECONDS = 300;
/** Added after a window's announced reset, so the next read sees the new window rather than the old one. */
export const WAIT_RESET_MARGIN_SECONDS = 60;
/** A read that yields no usable figure is retried this many times before the wait reports `unknown`. */
export const WAIT_UNREADABLE_RETRIES = 3;
export const WAIT_UNREADABLE_RETRY_SECONDS = 30;

/** One limit window flattened with its provider and the minutes left until its reset, as of the read. */
export type LimitReading = {
  provider: string;
  kind: string;
  windowMinutes: number | null;
  remainingPercent: number | null;
  resetsAtUtc: string | null;
  minutesToReset: number | null;
  /** Whether a wait holds on this window (a short window). */
  watched: boolean;
};

export type QuotaState = 'ready' | 'low' | 'unknown';

/** The outcome of a bounded wait. `low` and `ready` are successful readings; only `unknown` is an error. */
export type QuotaWait = {
  state: QuotaState;
  provider: string;
  thresholdPercent: number;
  /** Seconds spent waiting for resets, before the jitter. */
  waitedSeconds: number;
  /** Random delay applied after a wait ended `ready`, so runs waiting on the same reset do not start together. */
  jitterSeconds: number;
  checkedAtUtc: string;
  /** The watched windows at or below the threshold when the wait decided. Empty for `ready` and `unknown`. */
  blockers: LimitReading[];
  reason: string | null;
};

export type QuotaWaitOptions = {
  provider: string;
  thresholdPercent: number;
  maxWaitSeconds: number;
  jitterSeconds: number;
};

/** Time and randomness the wait uses. Tests inject a fake clock so no real time passes. */
export type QuotaClock = {
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  random: () => number;
};

export type QuotaWaitOutcome = {
  wait: QuotaWait;
  /** The last snapshot that was read successfully, or null when no read succeeded. */
  snapshot: TokenMonitorUsageSnapshot | null;
  /** Every window of the requested scope in that last snapshot, watched or not. */
  windows: LimitReading[];
};

export function remainingPercentOf(window: TokenMonitorLimitWindow): number | null {
  if (typeof window.remainingPercent === 'number' && Number.isFinite(window.remainingPercent)) {
    return clampPercent(window.remainingPercent);
  }

  if (typeof window.usedPercent === 'number' && Number.isFinite(window.usedPercent)) {
    return clampPercent(100 - window.usedPercent);
  }

  return null;
}

/** A window is short when its length is at most six hours. Without a length, only the `session` kind counts as short. */
export function isShortWindow(window: TokenMonitorLimitWindow): boolean {
  if (typeof window.windowMinutes === 'number') {
    return window.windowMinutes <= SHORT_WINDOW_MAX_MINUTES;
  }

  return window.kind === 'session';
}

/** Flattens the snapshot's limit windows, optionally for one provider, with the time left until each reset. */
export function readLimitWindows(
  snapshot: TokenMonitorUsageSnapshot,
  nowMs: number,
  provider?: string,
): LimitReading[] {
  const readings: LimitReading[] = [];

  for (const entry of snapshot.limits?.providers ?? []) {
    if (provider !== undefined && entry.provider !== provider) {
      continue;
    }

    for (const window of entry.windows ?? []) {
      const resetMs = window.resetsAtUtc ? Date.parse(window.resetsAtUtc) : Number.NaN;

      readings.push({
        provider: entry.provider,
        kind: window.kind,
        windowMinutes: typeof window.windowMinutes === 'number' ? window.windowMinutes : null,
        remainingPercent: remainingPercentOf(window),
        resetsAtUtc: window.resetsAtUtc ?? null,
        minutesToReset: Number.isNaN(resetMs) ? null : roundToTenth((resetMs - nowMs) / 60_000),
        watched: isShortWindow(window),
      });
    }
  }

  return readings;
}

/**
 * Why a snapshot cannot give a figure for the scope, or null when it can. The snapshot must be `ok`, and at least one
 * window in scope (watched only, for a wait) must carry a remaining figure.
 */
export function unusableReason(
  snapshot: TokenMonitorUsageSnapshot,
  readings: LimitReading[],
  provider: string | undefined,
  watchedOnly: boolean,
): string | null {
  if (snapshot.status !== 'ok') {
    return snapshot.failureReason
      ? `Token Monitor status is ${snapshot.status}: ${snapshot.failureReason}`
      : `Token Monitor status is ${snapshot.status}`;
  }

  const usable = readings.some(reading => (!watchedOnly || reading.watched) && reading.remainingPercent !== null);
  if (usable) {
    return null;
  }

  const scope = watchedOnly ? 'watched ' : '';
  return `no ${scope}${provider ?? 'provider'} window with a remaining figure in the Token Monitor snapshot`;
}

/**
 * Blocks while a watched window of `provider` is at or below the threshold, sleeping toward its reset and re-reading at
 * least every `WAIT_REFRESH_SECONDS`. It never fails for low quota: it returns `low` once `maxWaitSeconds` is used up,
 * `unknown` when no usable figure can be read, and `ready` otherwise.
 */
export async function waitForQuota(
  read: () => Promise<TokenMonitorUsageSnapshot>,
  options: QuotaWaitOptions,
  clock: QuotaClock,
): Promise<QuotaWaitOutcome> {
  const startedMs = clock.now();
  const waitedSeconds = () => Math.floor((clock.now() - startedMs) / 1000);
  let unreadableReads = 0;
  let lastSnapshot: TokenMonitorUsageSnapshot | null = null;
  let lastWindows: LimitReading[] = [];

  const finish = (state: QuotaState, outcome: Pick<QuotaWait, 'waitedSeconds' | 'jitterSeconds' | 'blockers' | 'reason'>): QuotaWaitOutcome => ({
    wait: {
      state,
      provider: options.provider,
      thresholdPercent: options.thresholdPercent,
      checkedAtUtc: new Date(clock.now()).toISOString(),
      ...outcome,
    },
    snapshot: lastSnapshot,
    windows: lastWindows,
  });

  for (;;) {
    let snapshot: TokenMonitorUsageSnapshot | null = null;
    let failure: string | null = null;

    try {
      snapshot = await read();
      lastSnapshot = snapshot;
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
    }

    const readings = snapshot ? readLimitWindows(snapshot, clock.now(), options.provider) : [];
    if (snapshot) {
      lastWindows = readings;
    }

    const reason = snapshot ? unusableReason(snapshot, readings, options.provider, true) : failure;
    if (reason !== null) {
      unreadableReads += 1;
      const waited = waitedSeconds();

      if (unreadableReads > WAIT_UNREADABLE_RETRIES || waited >= options.maxWaitSeconds) {
        return finish('unknown', { waitedSeconds: waited, jitterSeconds: 0, blockers: [], reason });
      }

      await clock.sleep(Math.min(WAIT_UNREADABLE_RETRY_SECONDS, options.maxWaitSeconds - waited) * 1000);
      continue;
    }

    unreadableReads = 0;
    const blockers = readings.filter(
      reading => reading.watched && reading.remainingPercent !== null && reading.remainingPercent <= options.thresholdPercent,
    );
    const waited = waitedSeconds();

    if (blockers.length === 0) {
      const jitter = options.jitterSeconds > 0 && waited > 0
        ? Math.floor(clock.random() * (options.jitterSeconds + 1))
        : 0;
      if (jitter > 0) {
        await clock.sleep(jitter * 1000);
      }

      return finish('ready', { waitedSeconds: waited, jitterSeconds: jitter, blockers: [], reason: null });
    }

    if (waited >= options.maxWaitSeconds) {
      return finish('low', { waitedSeconds: waited, jitterSeconds: 0, blockers, reason: null });
    }

    const untilResetSeconds = Math.max(
      ...blockers.map(reading => reading.minutesToReset === null
        ? WAIT_REFRESH_SECONDS
        : Math.max(0, reading.minutesToReset * 60) + WAIT_RESET_MARGIN_SECONDS),
    );
    const budgetSeconds = options.maxWaitSeconds - waited;
    const sleepSeconds = Math.max(1, Math.min(WAIT_REFRESH_SECONDS, untilResetSeconds, budgetSeconds));

    await clock.sleep(sleepSeconds * 1000);
  }
}

function clampPercent(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function roundToTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

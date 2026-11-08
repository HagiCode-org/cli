import { describe, expect, it, vi } from 'vitest';
import type { TokenMonitorLimitWindow, TokenMonitorUsageSnapshot } from '../../src/runtime/hagiApi';
import {
  WAIT_REFRESH_SECONDS,
  isShortWindow,
  readLimitWindows,
  remainingPercentOf,
  unusableReason,
  waitForQuota,
  type QuotaClock,
} from '../../src/runtime/usageLimits';

const NOW = '2026-11-08T22:00:00Z';
const NOW_MS = Date.parse(NOW);

/** A snapshot with one claude provider and the given windows. */
function snapshotWith(windows: TokenMonitorLimitWindow[]): TokenMonitorUsageSnapshot {
  return {
    status: 'ok',
    source: 'hostHub',
    limits: { providers: [{ provider: 'claude', status: 'ok', windows }] },
  };
}

/** A fake clock: `sleep` advances `now`, so a wait loop runs without real time. */
function fakeClock(random = () => 0) {
  let nowMs = NOW_MS;
  const sleeps: number[] = [];
  const clock: QuotaClock = {
    now: () => nowMs,
    sleep: vi.fn(async (ms: number) => {
      sleeps.push(ms);
      nowMs += ms;
    }),
    random,
  };
  return { clock, sleeps };
}

/** A reader that returns the given snapshots in order, then keeps returning the last one. */
function readerOf(...snapshots: Array<TokenMonitorUsageSnapshot | Error>) {
  let index = 0;
  return vi.fn(async () => {
    const next = snapshots[Math.min(index, snapshots.length - 1)];
    index += 1;
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
}

/** A reader that always returns a snapshot in which the claude session window is at `remaining` percent. */
function sessionAt(remaining: number, resetsAtUtc = '2026-11-08T23:10:00Z') {
  return snapshotWith([{ kind: 'session', remainingPercent: remaining, resetsAtUtc, windowMinutes: 300 }]);
}

const OPTIONS = { provider: 'claude', thresholdPercent: 10, maxWaitSeconds: 1800, jitterSeconds: 0 };

describe('limit window reading', () => {
  it('reads a full window with its remaining percent, reset time and minutes to reset', () => {
    const readings = readLimitWindows(sessionAt(43), NOW_MS, 'claude');

    expect(readings).toEqual([{
      provider: 'claude',
      kind: 'session',
      windowMinutes: 300,
      remainingPercent: 43,
      resetsAtUtc: '2026-11-08T23:10:00Z',
      minutesToReset: 70,
      watched: true,
    }]);
  });

  it('derives the remaining percent from the used percent when only that is reported', () => {
    expect(remainingPercentOf({ kind: 'session', usedPercent: 30 })).toBe(70);
    expect(remainingPercentOf({ kind: 'session', usedPercent: 130 })).toBe(0);
    expect(remainingPercentOf({ kind: 'session' })).toBeNull();
  });

  it('reports null for a missing reset time instead of guessing one', () => {
    const [reading] = readLimitWindows(snapshotWith([{ kind: 'session', remainingPercent: 50, windowMinutes: 300 }]), NOW_MS);

    expect(reading).toMatchObject({ resetsAtUtc: null, minutesToReset: null, remainingPercent: 50 });
  });

  it('keeps a weekly window in the report but does not watch it', () => {
    const [weekly] = readLimitWindows(snapshotWith([{ kind: 'weekly', remainingPercent: 3, windowMinutes: 10080 }]), NOW_MS);

    expect(weekly).toMatchObject({ kind: 'weekly', remainingPercent: 3, watched: false });
  });

  it('watches windows of six hours or less, and session windows that report no length', () => {
    expect(isShortWindow({ kind: 'session', windowMinutes: 360 })).toBe(true);
    expect(isShortWindow({ kind: 'weekly', windowMinutes: 361 })).toBe(false);
    expect(isShortWindow({ kind: 'session' })).toBe(true);
    expect(isShortWindow({ kind: 'weekly' })).toBe(false);
  });

  it('filters by provider', () => {
    const snapshot: TokenMonitorUsageSnapshot = {
      status: 'ok',
      source: 'hostHub',
      limits: {
        providers: [
          { provider: 'claude', status: 'ok', windows: [{ kind: 'session', remainingPercent: 43 }] },
          { provider: 'codex', status: 'ok', windows: [{ kind: 'session', usedPercent: 30 }] },
        ],
      },
    };

    expect(readLimitWindows(snapshot, NOW_MS, 'codex').map(reading => reading.provider)).toEqual(['codex']);
    expect(readLimitWindows(snapshot, NOW_MS).map(reading => reading.provider)).toEqual(['claude', 'codex']);
  });

  it('explains why a snapshot cannot give a figure', () => {
    expect(unusableReason({ status: 'readFailed', source: 'none', failureReason: 'bad json' }, [], 'claude', false))
      .toBe('Token Monitor status is readFailed: bad json');
    expect(unusableReason(sessionAt(5), [], 'claude', false)).toContain('no claude window');
    expect(unusableReason(
      snapshotWith([{ kind: 'weekly', remainingPercent: 3, windowMinutes: 10080 }]),
      readLimitWindows(snapshotWith([{ kind: 'weekly', remainingPercent: 3, windowMinutes: 10080 }]), NOW_MS, 'claude'),
      'claude',
      true,
    )).toContain('no watched claude window');
    expect(unusableReason(sessionAt(5), readLimitWindows(sessionAt(5), NOW_MS), 'claude', true)).toBeNull();
  });
});

describe('bounded wait', () => {
  it('returns ready at once with no sleep and no stagger when the first read is above the threshold', async () => {
    const { clock, sleeps } = fakeClock(() => 0.99);
    const outcome = await waitForQuota(readerOf(sessionAt(43)), { ...OPTIONS, jitterSeconds: 120 }, clock);

    expect(outcome.wait).toMatchObject({ state: 'ready', waitedSeconds: 0, jitterSeconds: 0, blockers: [], reason: null });
    expect(sleeps).toEqual([]);
    expect(outcome.windows).toHaveLength(1);
  });

  it('waits toward a reset in time and returns ready once the window rises', async () => {
    const { clock, sleeps } = fakeClock();
    const read = readerOf(sessionAt(4, '2026-11-08T22:20:00Z'), sessionAt(42, '2026-11-08T22:20:00Z'));
    const outcome = await waitForQuota(read, { ...OPTIONS, maxWaitSeconds: 1800 }, clock);

    expect(outcome.wait.state).toBe('ready');
    expect(outcome.wait.waitedSeconds).toBe(300);
    expect(sleeps).toEqual([WAIT_REFRESH_SECONDS * 1000]);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('returns low when the wait limit expires and never sleeps past it', async () => {
    const { clock, sleeps } = fakeClock();
    const outcome = await waitForQuota(readerOf(sessionAt(4, '2026-11-08T23:30:00Z')), { ...OPTIONS, maxWaitSeconds: 480 }, clock);

    expect(outcome.wait).toMatchObject({ state: 'low', waitedSeconds: 480, jitterSeconds: 0 });
    expect(outcome.wait.blockers).toEqual([expect.objectContaining({ remainingPercent: 4, watched: true })]);
    expect(sleeps).toEqual([300_000, 180_000]);
  });

  it('re-reads at least every five minutes when the reset is far away', async () => {
    const { clock, sleeps } = fakeClock();
    const read = readerOf(sessionAt(4, '2026-11-08T23:59:00Z'));
    await waitForQuota(read, { ...OPTIONS, maxWaitSeconds: 1200 }, clock);

    expect(sleeps.length).toBeGreaterThan(1);
    expect(Math.max(...sleeps)).toBeLessThanOrEqual(WAIT_REFRESH_SECONDS * 1000);
  });

  it('does not hold the wait on a weekly window that is nearly used up', async () => {
    const { clock, sleeps } = fakeClock();
    const outcome = await waitForQuota(
      readerOf(snapshotWith([
        { kind: 'session', remainingPercent: 60, windowMinutes: 300 },
        { kind: 'weekly', remainingPercent: 3, windowMinutes: 10080 },
      ])),
      { ...OPTIONS, thresholdPercent: 10 },
      clock,
    );

    expect(outcome.wait).toMatchObject({ state: 'ready', waitedSeconds: 0, blockers: [] });
    expect(sleeps).toEqual([]);
    expect(outcome.windows.map(reading => reading.kind)).toEqual(['session', 'weekly']);
  });

  it('checks once and returns low with max-wait 0 when the window is still low', async () => {
    const { clock, sleeps } = fakeClock();
    const read = readerOf(sessionAt(4));
    const outcome = await waitForQuota(read, { ...OPTIONS, maxWaitSeconds: 0 }, clock);

    expect(outcome.wait).toMatchObject({ state: 'low', waitedSeconds: 0 });
    expect(read).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it('retries a transient read failure and continues from the next usable figure', async () => {
    const { clock, sleeps } = fakeClock();
    const outcome = await waitForQuota(readerOf(new Error('socket reset'), sessionAt(43)), OPTIONS, clock);

    expect(outcome.wait).toMatchObject({ state: 'ready', reason: null });
    expect(sleeps).toEqual([30_000]);
  });

  it('gives up with unknown and the last failure message after the retries are used up', async () => {
    const { clock, sleeps } = fakeClock();
    const read = readerOf(new Error('first'), new Error('second'), new Error('third'), new Error('last failure'));
    const outcome = await waitForQuota(read, { ...OPTIONS, maxWaitSeconds: 1800 }, clock);

    expect(outcome.wait).toMatchObject({ state: 'unknown', reason: 'last failure', blockers: [] });
    expect(read).toHaveBeenCalledTimes(4);
    expect(sleeps).toEqual([30_000, 30_000, 30_000]);
    expect(outcome.snapshot).toBeNull();
  });

  it('keeps every unreadable retry inside max-wait', async () => {
    const { clock, sleeps } = fakeClock();
    const outcome = await waitForQuota(readerOf(new Error('down')), { ...OPTIONS, maxWaitSeconds: 40 }, clock);

    expect(outcome.wait.state).toBe('unknown');
    expect(sleeps.reduce((total, ms) => total + ms, 0)).toBeLessThanOrEqual(40_000);
  });

  it('reports unknown when the snapshot status is not ok, even if its figures look usable', async () => {
    const { clock } = fakeClock();
    const outcome = await waitForQuota(
      readerOf({ ...sessionAt(43), status: 'staleDate', failureReason: 'yesterday file' }),
      { ...OPTIONS, maxWaitSeconds: 0 },
      clock,
    );

    expect(outcome.wait).toMatchObject({ state: 'unknown', reason: 'Token Monitor status is staleDate: yesterday file' });
  });

  it('adds a random stagger after a wait that waited and ended ready, pinned at both ends', async () => {
    const low = sessionAt(4, '2026-11-08T22:20:00Z');
    const high = sessionAt(42, '2026-11-08T22:20:00Z');

    const floor = fakeClock(() => 0);
    const floorOutcome = await waitForQuota(readerOf(low, high), { ...OPTIONS, jitterSeconds: 120 }, floor.clock);
    expect(floorOutcome.wait).toMatchObject({ state: 'ready', waitedSeconds: 300, jitterSeconds: 0 });
    expect(floor.sleeps).toEqual([300_000]);

    const ceiling = fakeClock(() => 0.999999);
    const ceilingOutcome = await waitForQuota(readerOf(low, high), { ...OPTIONS, jitterSeconds: 120 }, ceiling.clock);
    expect(ceilingOutcome.wait).toMatchObject({ state: 'ready', waitedSeconds: 300, jitterSeconds: 120 });
    expect(ceiling.sleeps).toEqual([300_000, 120_000]);
  });
});

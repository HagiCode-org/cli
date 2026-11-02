import { describe, expect, it } from 'vitest';
import {
  isTransientSessionStatus,
  waitForSettledSession,
  type SessionWaitClock,
  type SessionWaitOptions,
} from '../../src/runtime/sessionWait';

/** A clock whose sleep moves time forward, so a wait finishes instantly and its timing is exact. */
function fakeClock(): SessionWaitClock & { elapsedMs: () => number } {
  let current = 0;
  return {
    now: () => current,
    sleep: async ms => {
      current += ms;
    },
    elapsedMs: () => current,
  };
}

/** Reads the statuses in order; the last one repeats once the list is used up. */
function readStatuses(statuses: string[]) {
  let index = 0;
  return async () => {
    const status = statuses[Math.min(index, statuses.length - 1)];
    index += 1;
    return { status, id: 'session-1' };
  };
}

const defaults: SessionWaitOptions = { intervalSeconds: 5, timeoutSeconds: 900, graceSeconds: 10 };

describe('waitForSettledSession', () => {
  it('waits through a transient status and returns the first stable one', async () => {
    const clock = fakeClock();
    const result = await waitForSettledSession(readStatuses(['Openspecing', 'Openspecing', 'Reviewing']), defaults, clock);

    expect(result).toMatchObject({ session: { status: 'Reviewing' }, settled: true, timedOut: false, transitionSeen: true, polls: 3 });
    expect(result.elapsedSeconds).toBe(10);
  });

  it('keeps polling a stable first status inside the grace window and settles after a transition', async () => {
    const clock = fakeClock();
    const result = await waitForSettledSession(readStatuses(['Init', 'Executing', 'ExecutionCompleted']), defaults, clock);

    expect(result).toMatchObject({ session: { status: 'ExecutionCompleted' }, settled: true, transitionSeen: true, polls: 3 });
  });

  it('returns a stable status without a transition once the grace window has passed', async () => {
    const clock = fakeClock();
    const result = await waitForSettledSession(readStatuses(['Reviewing']), defaults, clock);

    expect(result).toMatchObject({ session: { status: 'Reviewing' }, settled: true, timedOut: false, transitionSeen: false, polls: 3 });
    expect(result.elapsedSeconds).toBe(10);
  });

  it('returns a stable status immediately when the grace window is disabled', async () => {
    const clock = fakeClock();
    const result = await waitForSettledSession(readStatuses(['Init']), { ...defaults, graceSeconds: 0 }, clock);

    expect(result).toMatchObject({ settled: true, transitionSeen: false, polls: 1, elapsedSeconds: 0 });
    expect(clock.elapsedMs()).toBe(0);
  });

  it('treats WaitingForReply as settled so the caller can tell a person must answer', async () => {
    const clock = fakeClock();
    const result = await waitForSettledSession(readStatuses(['Executing', 'WaitingForReply']), defaults, clock);

    expect(result).toMatchObject({ session: { status: 'WaitingForReply' }, settled: true, timedOut: false, transitionSeen: true, polls: 2 });
  });

  it('stops at the timeout with the last status and timedOut set', async () => {
    const clock = fakeClock();
    const result = await waitForSettledSession(
      readStatuses(['Executing']),
      { intervalSeconds: 5, timeoutSeconds: 12, graceSeconds: 10 },
      clock,
    );

    expect(result).toMatchObject({ session: { status: 'Executing' }, settled: false, timedOut: true, transitionSeen: true, polls: 4 });
    expect(result.elapsedSeconds).toBe(12);
  });

  it('propagates an error thrown by the read without retrying it', async () => {
    const clock = fakeClock();
    let reads = 0;
    const failing = async () => {
      reads += 1;
      throw new Error('Cannot reach HagiCode backend');
    };

    await expect(waitForSettledSession(failing, defaults, clock)).rejects.toThrow('Cannot reach HagiCode backend');
    expect(reads).toBe(1);
  });

  it('recognises the four transient statuses only', () => {
    for (const status of ['Optimizing', 'Openspecing', 'Executing', 'Archiving']) {
      expect(isTransientSessionStatus(status)).toBe(true);
    }
    for (const status of ['Init', 'Drafting', 'Reviewing', 'WaitingForReply', 'ExecutionCompleted', 'Archived']) {
      expect(isTransientSessionStatus(status)).toBe(false);
    }
  });
});

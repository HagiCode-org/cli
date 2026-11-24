import { describe, expect, it } from 'vitest';
import {
  formatPlanDetailHuman,
  formatPlanListHuman,
  formatPlanListPayload,
  formatPlanSummaryHuman,
  summarizePlanPreflight,
  summarizePlanSchedule,
  toPlanView,
} from '../../src/formatters/plan';
import type { PCode_Web_Controllers_ScheduledPlanScheduleDto } from '../../src/generated/api/models/PCode_Web_Controllers_ScheduledPlanScheduleDto';
import { createPlan } from '../commands/testHelpers';

// 2026-11-14 00:00 in Los Angeles (PST) is 08:00 UTC; 2026-11-14 23:59 there is 07:59 UTC on 2026-11-15.
const laInterval: PCode_Web_Controllers_ScheduledPlanScheduleDto = {
  mode: 'recurring',
  timeZone: 'America/Los_Angeles',
  repeat: {
    rule: 'interval',
    windowStart: '2026-11-14T08:00:00Z',
    windowEnd: '2026-11-15T07:59:00Z',
    firstRunAt: '2026-11-14T08:00:00Z',
    intervalMinutes: 180,
  },
};

function intervalWith(intervalMinutes: number): PCode_Web_Controllers_ScheduledPlanScheduleDto {
  return { ...laInterval, repeat: { ...laInterval.repeat, intervalMinutes } };
}

describe('summarizePlanSchedule', () => {
  it('summarizes an interval plan with its interval, window, first trigger and zone in the plan zone', () => {
    expect(summarizePlanSchedule(laInterval)).toBe(
      'interval 3h 2026-11-14 00:00..2026-11-14 23:59 first 2026-11-14 00:00 America/Los_Angeles',
    );
  });

  it.each([
    [90, '90m'],
    [100, '100m'],
    [120, '2h'],
    [180, '3h'],
    [1440, '1d'],
    [2880, '2d'],
    [1500, '25h'],
  ])('shows an interval of %i minutes as %s, the largest whole unit', (minutes, label) => {
    expect(summarizePlanSchedule(intervalWith(minutes))).toMatch(new RegExp(`^interval ${label} `));
  });

  it('shows the instants as they were sent when the zone is not a valid IANA name', () => {
    const summary = summarizePlanSchedule({ ...laInterval, timeZone: 'Not/AZone' });
    expect(summary).toBe(
      'interval 3h 2026-11-14T08:00:00Z..2026-11-15T07:59:00Z first 2026-11-14T08:00:00Z Not/AZone',
    );
  });

  it('keeps the daily, weekly and once summaries unchanged', () => {
    expect(summarizePlanSchedule({
      mode: 'recurring',
      timeZone: 'Asia/Shanghai',
      startDate: '2026-04-01',
      timeOfDay: '02:00',
      repeat: { rule: 'daily', weekdays: null },
    })).toBe('daily 02:00 Asia/Shanghai');

    expect(summarizePlanSchedule({
      mode: 'recurring',
      timeZone: 'Asia/Shanghai',
      startDate: '2026-04-01',
      timeOfDay: '09:30',
      repeat: { rule: 'weekly', weekdays: ['monday', 'friday'] },
    })).toBe('weekly mon,fri 09:30 Asia/Shanghai');

    expect(summarizePlanSchedule({ mode: 'once', runAt: '2026-04-20T00:00:00Z' })).toBe('once 2026-04-20T00:00:00Z');
  });

  it('shows an unknown rule as the backend sent it', () => {
    expect(summarizePlanSchedule({
      mode: 'recurring',
      timeZone: 'Asia/Shanghai',
      timeOfDay: '02:00',
      repeat: { rule: 'monthly' },
    })).toBe('monthly 02:00 Asia/Shanghai');
  });

  it('returns an empty string when the plan has no schedule', () => {
    expect(summarizePlanSchedule(undefined)).toBe('');
  });
});

describe('plan views with an interval schedule', () => {
  const plan = createPlan('plan-2', {
    schedule: laInterval,
    nextRunAt: '2026-11-14T11:00:00Z',
  });

  it('lists an interval plan with its schedule summary and next run', () => {
    const output = formatPlanListHuman([toPlanView(plan)]);

    expect(output).toContain('plan-2');
    expect(output).toContain('2026-11-14T11:00:00Z');
    expect(output).toContain('interval 3h 2026-11-14 00:00..2026-11-14 23:59 first 2026-11-14 00:00 America/Los_Angeles');
  });

  it('shows a completed interval plan with a dash for the next run', () => {
    const output = formatPlanListHuman([toPlanView(createPlan('plan-3', { state: 'completed', nextRunAt: null, schedule: laInterval }))]);

    expect(output).toMatch(/completed\s+-\s+interval 3h/);
  });

  it('shows the schedule and next run in the plan summary', () => {
    const output = formatPlanSummaryHuman(toPlanView(plan));

    expect(output).toMatch(/^nextRun\s+2026-11-14T11:00:00Z$/m);
    expect(output).toMatch(/^schedule\s+interval 3h 2026-11-14 00:00\.\.2026-11-14 23:59 first 2026-11-14 00:00 America\/Los_Angeles$/m);
  });

  it('keeps the interval fields in the view that --json prints', () => {
    const view = toPlanView(plan);

    expect(JSON.parse(JSON.stringify(view)).schedule.repeat).toEqual({
      rule: 'interval',
      windowStart: '2026-11-14T08:00:00Z',
      windowEnd: '2026-11-15T07:59:00Z',
      firstRunAt: '2026-11-14T08:00:00Z',
      intervalMinutes: 180,
    });
  });
});

describe('plan preflight view', () => {
  it('keeps the full preflight in the view and shows one row with the timeout', () => {
    const plan = { ...createPlan('plan-4'), preflight: { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 } };
    const view = toPlanView(plan as never);

    expect(view.preflight).toEqual({ runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 });
    expect(formatPlanSummaryHuman(view)).toMatch(/^preflight\s+node scripts\/check\.mjs timeout 120s$/m);
  });

  it('shows the preflight without a timeout and adds no timeout text', () => {
    const plan = { ...createPlan('plan-5'), preflight: { runtime: 'bash', file: 'scripts/check.sh' } };
    const view = toPlanView(plan as never);

    expect(view.preflight).toEqual({ runtime: 'bash', file: 'scripts/check.sh' });
    const output = formatPlanSummaryHuman(view);
    expect(output).toMatch(/^preflight\s+bash scripts\/check\.sh$/m);
    expect(output).not.toContain('timeout');
  });

  it('omits the preflight key and row when the plan has none', () => {
    const view = toPlanView(createPlan('plan-6') as never);

    expect(view).not.toHaveProperty('preflight');
    expect(JSON.parse(JSON.stringify(view))).not.toHaveProperty('preflight');
    expect(formatPlanSummaryHuman(view)).not.toMatch(/^preflight/m);
  });

  it('keeps a zero timeout visible because it is a set value', () => {
    const plan = { ...createPlan('plan-7'), preflight: { runtime: 'node', file: 'a.mjs', timeoutSeconds: 0 } };

    expect(summarizePlanPreflight(toPlanView(plan as never).preflight)).toBe('node a.mjs timeout 0s');
  });
});

describe('quota-reset schedule summary', () => {
  const quotaSchedule = (
    quotaReset: NonNullable<PCode_Web_Controllers_ScheduledPlanScheduleDto['quotaReset']>,
  ): PCode_Web_Controllers_ScheduledPlanScheduleDto => ({ mode: 'quotaReset', quotaReset });

  it.each([
    [{ requireManualConfirmation: true, skipConfirmationDuringUnattendedHours: true }, 'manual skip-unattended'],
    [{ requireManualConfirmation: true, skipConfirmationDuringUnattendedHours: false }, 'manual'],
    [{ requireManualConfirmation: false, skipConfirmationDuringUnattendedHours: true }, 'skip-unattended'],
    [{ requireManualConfirmation: false, skipConfirmationDuringUnattendedHours: false }, ''],
    [{}, ''],
  ])('names the window, minimum percent and maximum minutes, and only the flags that are set (%j)', (flags, suffix) => {
    const summary = summarizePlanSchedule(quotaSchedule({
      window: 'claudeFiveHour',
      minRemainingPercent: 20,
      maxMinutesBeforeReset: 60,
      ...flags,
    }));

    expect(summary).toBe(`quotaReset claudeFiveHour >=20% <=60m${suffix ? ` ${suffix}` : ''}`);
  });

  it('prints the example from the spec with both flags', () => {
    expect(summarizePlanSchedule(quotaSchedule({
      window: 'claudeFiveHour',
      minRemainingPercent: 20,
      maxMinutesBeforeReset: 60,
      requireManualConfirmation: true,
      skipConfirmationDuringUnattendedHours: false,
    }))).toBe('quotaReset claudeFiveHour >=20% <=60m manual');
  });

  it('still prints the once, daily and weekly summaries unchanged next to it', () => {
    expect(summarizePlanSchedule({ mode: 'once', runAt: '2026-04-20T00:00:00Z' })).toBe('once 2026-04-20T00:00:00Z');
    expect(summarizePlanSchedule({
      mode: 'recurring',
      timeZone: 'Asia/Shanghai',
      timeOfDay: '09:30',
      repeat: { rule: 'daily' },
    })).toBe('daily 09:30 Asia/Shanghai');
  });
});

describe('quota-reset trigger view', () => {
  const pending = createPlan('plan-q', {
    schedule: { mode: 'quotaReset', timeZone: 'America/Los_Angeles', quotaReset: { window: 'claudeFiveHour', minRemainingPercent: 20, maxMinutesBeforeReset: 60, requireManualConfirmation: true } },
    state: 'scheduled',
    lastTriggeredResetAt: '2026-11-13T08:00:00Z',
    pendingQuotaTrigger: { raisedAt: '2026-11-14T08:00:00Z', windowResetAt: '2026-11-14T13:00:00Z' },
  });

  it('carries lastTriggeredResetAt and pendingQuotaTrigger as null when the backend sends neither', () => {
    const view = toPlanView(createPlan('plan-plain'));

    expect(view.lastTriggeredResetAt).toBeNull();
    expect(view.pendingQuotaTrigger).toBeNull();
    expect(JSON.parse(JSON.stringify(formatPlanListPayload([createPlan('plan-plain')])))).toMatchObject({
      plans: [{ lastTriggeredResetAt: null, pendingQuotaTrigger: null }],
    });
  });

  it('carries the trigger fields into the list --json payload', () => {
    const payload = JSON.parse(JSON.stringify(formatPlanListPayload([pending])));

    expect(payload.plans[0]).toMatchObject({
      lastTriggeredResetAt: '2026-11-13T08:00:00Z',
      pendingQuotaTrigger: { raisedAt: '2026-11-14T08:00:00Z', windowResetAt: '2026-11-14T13:00:00Z' },
    });
  });

  it('marks a pending trigger in the list State cell', () => {
    expect(formatPlanListHuman([toPlanView(pending)])).toMatch(/scheduled \(trigger pending\)/);
  });

  it('leaves the list State cell alone when no trigger is pending', () => {
    const output = formatPlanListHuman([toPlanView(createPlan('plan-plain'))]);

    expect(output).not.toContain('trigger pending');
    expect(output).toMatch(/scheduled\s/);
  });

  it('shows the last reset and the pending trigger in plan get, with the resolving commands', () => {
    const output = formatPlanDetailHuman(toPlanView(pending));

    expect(output).toMatch(/^lastTriggeredReset\s+2026-11-13 00:00$/m);
    expect(output).toMatch(/^pendingTrigger\s+pending since 2026-11-14 00:00, window resets 2026-11-14 05:00$/m);
    expect(output).toContain('hagi plan confirm --id plan-q');
    expect(output).toContain('hagi plan cancel-trigger --id plan-q');
  });

  it('shows only the last reset in plan get when nothing is pending', () => {
    const view = toPlanView(createPlan('plan-done', { lastTriggeredResetAt: '2026-11-13T08:00:00Z' }));
    const output = formatPlanDetailHuman(view);

    // The default fixture schedule is Asia/Shanghai, so 08:00Z is shown as 16:00 in that zone.
    expect(output).toMatch(/^lastTriggeredReset\s+2026-11-13 16:00$/m);
    expect(output).not.toMatch(/^pendingTrigger/m);
    expect(output).not.toContain('hagi plan confirm');
  });

  it('adds no trigger rows to plan get for a plan that never triggered on a reset', () => {
    const view = toPlanView(createPlan('plan-new'));

    expect(formatPlanDetailHuman(view)).toBe(formatPlanSummaryHuman(view));
  });

  it('keeps raw instants when the schedule has no valid zone', () => {
    const output = formatPlanDetailHuman(toPlanView(createPlan('plan-raw', {
      schedule: { mode: 'quotaReset', timeZone: 'Not/AZone', quotaReset: { window: 'claudeFiveHour' } },
      pendingQuotaTrigger: { raisedAt: '2026-11-14T08:00:00Z', windowResetAt: null },
    })));

    expect(output).toMatch(/^pendingTrigger\s+pending since 2026-11-14T08:00:00Z$/m);
  });
});

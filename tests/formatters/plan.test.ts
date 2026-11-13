import { describe, expect, it } from 'vitest';
import {
  formatPlanListHuman,
  formatPlanSummaryHuman,
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

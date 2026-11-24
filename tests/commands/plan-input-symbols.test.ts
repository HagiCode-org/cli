import { Command } from 'commander';
import { describe, expect, it } from 'vitest';
import { addPlanScheduleOptions, hasPlanScheduleFlags, mergePlan, stripServerFields } from '../../src/commands/plan/input';

describe('hasPlanScheduleFlags (src/commands/plan/input.ts)', () => {
  it('is false for an empty flag set', () => {
    expect(hasPlanScheduleFlags({})).toBe(false);
  });

  it('is false when every flag is explicitly undefined', () => {
    expect(
      hasPlanScheduleFlags({ windowStart: undefined, windowEnd: undefined, firstAt: undefined, every: undefined, timeZone: undefined }),
    ).toBe(false);
  });

  it.each([
    ['windowStart', { windowStart: '2026-11-14T00:00-08:00' }],
    ['windowEnd', { windowEnd: '2026-11-15T00:00-08:00' }],
    ['firstAt', { firstAt: '2026-11-14T01:00-08:00' }],
    ['every', { every: '3h' }],
    ['timeZone', { timeZone: 'Asia/Shanghai' }],
  ])('is true when only %s was passed', (_name, flags) => {
    expect(hasPlanScheduleFlags(flags)).toBe(true);
  });

  it('counts an empty string as a passed flag', () => {
    expect(hasPlanScheduleFlags({ every: '' })).toBe(true);
  });
});

describe('addPlanScheduleOptions (src/commands/plan/input.ts)', () => {
  const build = () => addPlanScheduleOptions(new Command('create').exitOverride().configureOutput({ writeErr: () => undefined, writeOut: () => undefined }));

  it('returns the same command so calls can be chained', () => {
    const command = new Command('update');

    expect(addPlanScheduleOptions(command)).toBe(command);
  });

  it('registers exactly the five schedule flags', () => {
    const flags = build().options.map(option => option.long);

    expect(flags).toEqual(['--window-start', '--window-end', '--first-at', '--every', '--time-zone']);
  });

  it('gives every flag a required value and a description', () => {
    for (const option of build().options) {
      expect(option.required).toBe(true);
      expect(option.description.length).toBeGreaterThan(0);
    }
  });

  it('parses the flags into camel-cased option names that match PlanScheduleFlags', () => {
    const command = build().action(() => undefined);
    command.parse(
      ['--window-start', '2026-11-14T00:00-08:00', '--window-end', '2026-11-15T00:00-08:00', '--first-at', '2026-11-14T01:00-08:00', '--every', '90m', '--time-zone', 'Asia/Shanghai'],
      { from: 'user' },
    );

    expect(command.opts()).toEqual({
      windowStart: '2026-11-14T00:00-08:00',
      windowEnd: '2026-11-15T00:00-08:00',
      firstAt: '2026-11-14T01:00-08:00',
      every: '90m',
      timeZone: 'Asia/Shanghai',
    });
    expect(hasPlanScheduleFlags(command.opts())).toBe(true);
  });

  it('leaves the options empty when no flag is passed', () => {
    const command = build().action(() => undefined);
    command.parse([], { from: 'user' });

    expect(command.opts()).toEqual({});
    expect(hasPlanScheduleFlags(command.opts())).toBe(false);
  });

  it('rejects a flag value that is missing', () => {
    const command = build().action(() => undefined);

    expect(() => command.parse(['--every'], { from: 'user' })).toThrow(/argument missing/);
  });

  it('keeps options already on the command', () => {
    const command = new Command('create').option('--name <name>');
    addPlanScheduleOptions(command);

    expect(command.options.map(option => option.long)).toContain('--name');
    expect(command.options).toHaveLength(6);
  });
});

describe('mergePlan preflight (src/commands/plan/input.ts)', () => {
  const current = {
    id: 'plan-1',
    type: 'hagitask',
    name: 'Nightly review',
    enabled: true,
    state: 'scheduled',
    nextRunAt: '2026-05-01T18:00:00Z',
    payload: { title: 'Nightly review' },
    preflight: { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 },
  };

  it('keeps the current preflight when the changes do not mention it', () => {
    expect(mergePlan(current, { enabled: false })).toMatchObject({
      enabled: false,
      preflight: { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 },
    });
  });

  it('replaces the preflight as a whole value when the changes set one', () => {
    const merged = mergePlan(current, { preflight: { runtime: 'bash', file: 'scripts/other.sh' } });

    expect(merged.preflight).toEqual({ runtime: 'bash', file: 'scripts/other.sh' });
    expect(merged.preflight).not.toHaveProperty('timeoutSeconds');
  });

  it('omits the preflight from the replacement when the changes clear it with null', () => {
    const merged = mergePlan(current, { preflight: null });

    expect(merged).not.toHaveProperty('preflight');
    expect(merged).toMatchObject({ name: 'Nightly review', enabled: true });
  });

  it('adds no preflight when the current plan has none', () => {
    const { preflight: _omitted, ...withoutPreflight } = current;

    expect(mergePlan(withoutPreflight, { enabled: false })).not.toHaveProperty('preflight');
  });
});

describe('backend-owned trigger fields (src/commands/plan/input.ts)', () => {
  const triggerFields = {
    lastTriggeredResetAt: '2026-11-13T08:00:00Z',
    pendingQuotaTrigger: { raisedAt: '2026-11-14T08:00:00Z', windowResetAt: '2026-11-14T13:00:00Z' },
  };

  it('stripServerFields removes lastTriggeredResetAt and pendingQuotaTrigger and keeps quotaReset', () => {
    const quotaSchedule = { mode: 'quotaReset', quotaReset: { window: 'claudeFiveHour', minRemainingPercent: 20 } };
    const stripped = stripServerFields({ id: 'plan-1', name: 'Nightly', schedule: quotaSchedule, ...triggerFields });

    expect(stripped).toEqual({ name: 'Nightly', schedule: quotaSchedule });
  });

  it('mergePlan never carries the trigger fields of the current plan into the request', () => {
    const merged = mergePlan({ id: 'plan-1', name: 'Nightly', enabled: true, ...triggerFields }, { enabled: false });

    expect(merged).toEqual({ name: 'Nightly', enabled: false });
  });
});

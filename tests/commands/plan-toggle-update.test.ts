import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerPlanUpdateCommand } from '../../src/commands/plan/update';
import { setPlanEnabled } from '../../src/commands/plan/toggle';
import { runCli } from '../../src/main';
import type { CommandContext } from '../../src/runtime/commandContext';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createPlan } from './testHelpers';

const plan = (...args: string[]) => ['node', 'hagi', 'plan', ...args];

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'hagi-plan-update-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

const writeDocument = (name: string, document: unknown) => {
  const path = join(tempDir, name);
  writeFileSync(path, JSON.stringify(document), 'utf8');
  return path;
};

describe('setPlanEnabled (src/commands/plan/toggle.ts)', () => {
  const contextFor = (api: Record<string, unknown>) => ({ api }) as unknown as CommandContext;

  it('reads the plan and sends a full replacement with only enabled changed', async () => {
    const current = createPlan('plan-1', { enabled: false, name: 'Nightly' });
    const updated = createPlan('plan-1', { enabled: true, name: 'Nightly' });
    const api = { getPlan: vi.fn().mockResolvedValue(current), updatePlan: vi.fn().mockResolvedValue(updated) };

    const result = await setPlanEnabled(contextFor(api), 'plan-1', true);

    expect(api.getPlan).toHaveBeenCalledExactlyOnceWith('plan-1');
    const [, body] = api.updatePlan.mock.calls[0];
    expect(api.updatePlan.mock.calls[0][0]).toBe('plan-1');
    expect(body).toMatchObject({ enabled: true, name: 'Nightly', type: current.type });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(result.changed).toBe(true);
    expect(result.view.enabled).toBe(true);
  });

  it.each([true, false])('sends nothing and reports unchanged when the plan already has enabled %s', async enabled => {
    const api = { getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled })), updatePlan: vi.fn() };

    const result = await setPlanEnabled(contextFor(api), 'plan-1', enabled);

    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(result).toMatchObject({ changed: false, view: { id: 'plan-1', enabled } });
  });

  it('returns the view of the plan the backend answered with', async () => {
    const api = {
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
      updatePlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false, nextRunAt: null })),
    };

    const result = await setPlanEnabled(contextFor(api), 'plan-1', false);

    expect(result.view.enabled).toBe(false);
  });

  it('lets a read failure through without updating', async () => {
    const api = { getPlan: vi.fn().mockRejectedValue(new Error('gone')), updatePlan: vi.fn() };

    await expect(setPlanEnabled(contextFor(api), 'plan-1', true)).rejects.toThrow('gone');
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('lets an update failure through', async () => {
    const api = {
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
      updatePlan: vi.fn().mockRejectedValue(new Error('rejected')),
    };

    await expect(setPlanEnabled(contextFor(api), 'plan-1', true)).rejects.toThrow('rejected');
  });
});

describe('hagi plan update (registerPlanUpdateCommand)', () => {
  it('exports the registration function the plan group calls', () => {
    expect(typeof registerPlanUpdateCommand).toBe('function');
  });

  it('prints the updated plan under a plan key as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      updatePlan: async () => createPlan('plan-1', { name: 'Renamed' }),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--name', 'Renamed', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(Object.keys(body)).toEqual(['plan']);
    expect(body.plan).toMatchObject({ id: 'plan-1', name: 'Renamed' });
  });

  it('starts the human output with Plan updated', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(plan('update', '--id', 'plan-1', '--name', 'Renamed'), dependencies)).toBe(0);
    expect(stdout.join('')).toMatch(/^Plan updated\n/);
  });

  it('trims the id and the name before using them', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('update', '--id', '  plan-1 ', '--name', '  Spaced  '), dependencies)).toBe(0);
    expect(api.getPlan).toHaveBeenCalledWith('plan-1');
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', expect.objectContaining({ name: 'Spaced' }));
  });

  it.each([
    ['a whitespace-only name', ['--name', '   ']],
    ['a whitespace-only hero id', ['--hero-id', '  ']],
    ['a whitespace-only input path', ['--input', ' ']],
  ])('counts %s as no change and sends nothing', async (_label, flags) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(plan('update', '--id', 'plan-1', ...flags), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Provide at least one change');
    expect(api.getPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only id before any request', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(plan('update', '--id', '  ', '--name', 'X'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.getPlan).not.toHaveBeenCalled();
  });

  it('names --enabled and --disabled in the conflict message', async () => {
    const { dependencies, stderr } = createDependencies();

    expect(await runCli(plan('update', '--id', 'plan-1', '--enabled', '--disabled'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Pass either --enabled or --disabled, not both.');
  });

  it('lets a flag override the same field of the input document', async () => {
    const { dependencies, api } = createDependencies();
    const path = writeDocument('doc.json', { name: 'From document', enabled: false });

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path, '--name', 'From flag'), dependencies)).toBe(0);
    const [, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(body).toMatchObject({ name: 'From flag', enabled: false });
  });

  it('drops server-owned fields that the input document carries', async () => {
    const { dependencies, api } = createDependencies();
    const path = writeDocument('doc.json', { id: 'other-plan', createdAt: 'x', updatedAt: 'y', name: 'Doc name' });

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path), dependencies)).toBe(0);
    const [id, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(id).toBe('plan-1');
    expect(body).toMatchObject({ name: 'Doc name' });
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
  });

  it('fails on an unreadable input file before reading the plan', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', join(tempDir, 'missing.json')), dependencies)).not.toBe(0);
    expect(api.getPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('fails on an input file that is not valid JSON before reading the plan', async () => {
    const { dependencies, api } = createDependencies();
    const path = join(tempDir, 'broken.json');
    writeFileSync(path, '{not json', 'utf8');

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path), dependencies)).not.toBe(0);
    expect(api.getPlan).not.toHaveBeenCalled();
  });

  it('maps a rejected update to the bad-request exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      updatePlan: vi.fn().mockRejectedValue(createApiError(400, { error: 'Invalid schedule.' })),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--name', 'X'), dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stdout.join('')).toBe('');
  });
});

describe('stored preflight survives plan replacements (round trip)', () => {
  const preflight = { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 };
  const withPreflight = (overrides: Partial<Parameters<typeof createPlan>[1]> = {}) => ({ ...createPlan('plan-1', overrides), preflight });

  it('plan update --name sends a replacement carrying the stored preflight', async () => {
    const { dependencies, api } = createDependencies({ getPlan: vi.fn().mockResolvedValue(withPreflight()) });

    expect(await runCli(plan('update', '--id', 'plan-1', '--name', 'Renamed'), dependencies)).toBe(0);
    const [, body] = api.updatePlan.mock.calls[0];
    expect(body).toMatchObject({ name: 'Renamed', preflight });
    expect(body).not.toHaveProperty('id');
  });

  it('plan enable sends a replacement carrying the stored preflight', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(withPreflight({ enabled: false })),
    });

    expect(await runCli(plan('enable', '--id', 'plan-1'), dependencies)).toBe(0);
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', expect.objectContaining({ enabled: true, preflight }));
  });

  it('plan disable sends a replacement carrying the stored preflight', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(withPreflight({ enabled: true })),
    });

    expect(await runCli(plan('disable', '--id', 'plan-1'), dependencies)).toBe(0);
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', expect.objectContaining({ enabled: false, preflight }));
  });

  it.each([
    ['update --name', ['update', '--id', 'plan-1', '--name', 'Renamed']],
    ['enable', ['enable', '--id', 'plan-1']],
    ['disable', ['disable', '--id', 'plan-1']],
  ])('%s on a plan without a preflight sends no preflight', async (_label, args) => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: args[0] === 'enable' ? false : true })),
    });

    expect(await runCli(plan(...args), dependencies)).toBe(0);
    const [, body] = api.updatePlan.mock.calls[0];
    expect(body).not.toHaveProperty('preflight');
  });

  it('plan update --name keeps the preflight without a timeout exactly as stored', async () => {
    const stored = { runtime: 'bash', file: 'scripts/check.sh' };
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue({ ...createPlan('plan-1'), preflight: stored }),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--name', 'Renamed'), dependencies)).toBe(0);
    const [, body] = api.updatePlan.mock.calls[0];
    expect(body.preflight).toEqual(stored);
    expect(body.preflight).not.toHaveProperty('timeoutSeconds');
  });
});

describe('plan update --input and preflight', () => {
  const preflight = { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 };
  const storedPlan = () => ({ ...createPlan('plan-1'), preflight });

  it('replaces the stored preflight as a whole value from the document', async () => {
    const { dependencies, api } = createDependencies({ getPlan: vi.fn().mockResolvedValue(storedPlan()) });
    const path = writeDocument('preflight-set.json', { preflight: { runtime: 'bash', file: 'scripts/other.sh' } });

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path), dependencies)).toBe(0);
    const [, body] = api.updatePlan.mock.calls[0];
    expect(body.preflight).toEqual({ runtime: 'bash', file: 'scripts/other.sh' });
    expect(body.preflight).not.toHaveProperty('timeoutSeconds');
  });

  it('omits the preflight from the replacement when the document sets null', async () => {
    const { dependencies, api } = createDependencies({ getPlan: vi.fn().mockResolvedValue(storedPlan()) });
    const path = writeDocument('preflight-null.json', { preflight: null });

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path), dependencies)).toBe(0);
    const [, body] = api.updatePlan.mock.calls[0];
    expect(body).not.toHaveProperty('preflight');
  });

  it('keeps the stored preflight when the document does not mention it', async () => {
    const { dependencies, api } = createDependencies({ getPlan: vi.fn().mockResolvedValue(storedPlan()) });
    const path = writeDocument('no-preflight.json', { name: 'From document' });

    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path), dependencies)).toBe(0);
    const [, body] = api.updatePlan.mock.calls[0];
    expect(body).toMatchObject({ name: 'From document', preflight });
  });
});

describe('quota-reset schedule through plan create and update', () => {
  const quotaSchedule = {
    mode: 'quotaReset',
    timeZone: 'America/Los_Angeles',
    quotaReset: {
      window: 'claudeFiveHour',
      minRemainingPercent: 20,
      maxMinutesBeforeReset: 60,
      requireManualConfirmation: true,
      skipConfirmationDuringUnattendedHours: false,
    },
  };
  const triggered = {
    lastTriggeredResetAt: '2026-11-13T08:00:00Z',
    pendingQuotaTrigger: { raisedAt: '2026-11-14T08:00:00Z', windowResetAt: '2026-11-14T13:00:00Z' },
  };
  const currentQuotaPlan = () => createPlan('plan-1', { schedule: quotaSchedule, ...triggered });

  it('keeps quotaReset unchanged on a plain update, with the values the backend returned', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--name', 'Renamed'), dependencies)).toBe(0);
    const [, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(body.schedule).toEqual(quotaSchedule);
  });

  it('keeps quotaReset when only the time zone changes', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--time-zone', 'Asia/Tokyo'), dependencies)).toBe(0);
    const [, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(body.schedule).toEqual({ ...quotaSchedule, timeZone: 'Asia/Tokyo' });
  });

  it('replaces the whole schedule, and so drops quotaReset, when all interval flags are passed', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });

    expect(await runCli(plan(
      'update', '--id', 'plan-1',
      '--window-start', '2026-11-14T00:00-08:00',
      '--window-end', '2026-11-15T00:00-08:00',
      '--first-at', '2026-11-14T01:00-08:00',
      '--every', '3h',
    ), dependencies)).toBe(0);
    const [, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(body.schedule).not.toHaveProperty('quotaReset');
    expect(body.schedule.repeat).toMatchObject({ rule: 'interval', intervalMinutes: 180 });
  });

  it('refuses partial interval flags on a quota-reset schedule before any update', async () => {
    const { dependencies, api, stderr } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--every', '3h'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Missing: --window-start, --window-end, --first-at');
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('forwards quotaReset from a create document unchanged', async () => {
    const { dependencies, api } = createDependencies();
    const path = writeDocument('quota-create.json', {
      type: 'hagitask',
      name: 'Quota plan',
      schedule: quotaSchedule,
      payload: { title: 'Quota', message: 'Run on reset', projectId: 'project-1' },
    });

    expect(await runCli(plan('create', '--input', path), dependencies)).toBe(0);
    const [body] = vi.mocked(api.createPlan).mock.calls[0];
    expect(body.schedule).toEqual(quotaSchedule);
  });

  it('does not send the trigger fields when plan get --json output is reused as --input for update', async () => {
    const { dependencies: getDeps, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });
    expect(await runCli(plan('get', '--id', 'plan-1', '--json'), getDeps)).toBe(0);
    const path = writeDocument('reused.json', JSON.parse(stdout.join('')).plan);

    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });
    expect(await runCli(plan('update', '--id', 'plan-1', '--input', path), dependencies)).toBe(0);
    const [, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(body).not.toHaveProperty('lastTriggeredResetAt');
    expect(body).not.toHaveProperty('pendingQuotaTrigger');
    expect(body.schedule).toEqual(quotaSchedule);
  });

  it('does not send the trigger fields to update when they come from the current plan', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(currentQuotaPlan()),
    });

    expect(await runCli(plan('update', '--id', 'plan-1', '--enabled'), dependencies)).toBe(0);
    const [, body] = vi.mocked(api.updatePlan).mock.calls[0];
    expect(body).not.toHaveProperty('lastTriggeredResetAt');
    expect(body).not.toHaveProperty('pendingQuotaTrigger');
  });
});

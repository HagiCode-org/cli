import { describe, expect, it, vi } from 'vitest';
import { registerPlanCancelTriggerCommand } from '../../src/commands/plan/cancelTrigger';
import { registerPlanConfirmCommand } from '../../src/commands/plan/confirm';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createPlan } from './testHelpers';

const plan = (...args: string[]) => ['node', 'hagi', 'plan', ...args];

describe('registration functions', () => {
  it('are exported for the plan group', () => {
    expect(typeof registerPlanConfirmCommand).toBe('function');
    expect(typeof registerPlanCancelTriggerCommand).toBe('function');
  });
});

describe('hagi plan confirm (registerPlanConfirmCommand)', () => {
  it('calls the confirmation once with the trimmed id and prints the accepted run', async () => {
    const { dependencies, api, stdout } = createDependencies({
      confirmPlanQuotaTrigger: vi.fn().mockResolvedValue({ planId: 'plan-1' }),
    });

    expect(await runCli(plan('confirm', '--id', ' plan-1 '), dependencies)).toBe(0);
    expect(api.confirmPlanQuotaTrigger).toHaveBeenCalledExactlyOnceWith('plan-1');
    expect(stdout.join('')).toMatch(/^Plan run accepted\n/);
    expect(stdout.join('')).toContain('plan-1');
    expect(stdout.join('')).toContain('accepted');
  });

  it('prints planId and accepted true as JSON, with nothing else', async () => {
    const { dependencies, stdout } = createDependencies({
      confirmPlanQuotaTrigger: vi.fn().mockResolvedValue({ planId: 'plan-7' }),
    });

    expect(await runCli(plan('confirm', '--id', 'plan-7', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ planId: 'plan-7', accepted: true });
  });

  it('does not read or update the plan', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(plan('confirm', '--id', 'plan-1'), dependencies);

    expect(api.getPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('exits with usage code 2 and makes no backend call when --id is missing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('confirm'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.confirmPlanQuotaTrigger).not.toHaveBeenCalled();
  });

  it('exits with usage code 2 and makes no backend call for a whitespace-only --id', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(plan('confirm', '--id', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.confirmPlanQuotaTrigger).not.toHaveBeenCalled();
  });

  it('maps a 400 from the backend to exit code 20', async () => {
    const { dependencies, stdout } = createDependencies({
      confirmPlanQuotaTrigger: vi.fn().mockRejectedValue(createApiError(400, { error: 'Plan is disabled.' })),
    });

    expect(await runCli(plan('confirm', '--id', 'plan-1'), dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stdout.join('')).toBe('');
  });

  it('maps an unknown plan (404) to exit code 24', async () => {
    const { dependencies, stdout } = createDependencies({
      confirmPlanQuotaTrigger: vi.fn().mockRejectedValue(createApiError(404, { error: 'Plan not found.' })),
    });

    expect(await runCli(plan('confirm', '--id', 'missing'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
  });

  it('maps a trigger that is no longer waiting (409) to exit code 29 and prints no accepted run', async () => {
    const { dependencies, stdout, stderr } = createDependencies({
      confirmPlanQuotaTrigger: vi.fn().mockRejectedValue(
        createApiError(409, { error: 'The quota trigger is no longer waiting for confirmation.' }),
      ),
    });

    expect(await runCli(plan('confirm', '--id', 'plan-1'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stdout.join('')).not.toContain('Plan run accepted');
    expect(stdout.join('')).toBe('');
    expect(stderr.join('')).toContain('no longer waiting');
  });

  it('maps an unavailable backend (503) to exit code 50', async () => {
    const { dependencies, stdout } = createDependencies({
      confirmPlanQuotaTrigger: vi.fn().mockRejectedValue(createApiError(503, { error: 'Scheduler unavailable.' })),
    });

    expect(await runCli(plan('confirm', '--id', 'plan-1'), dependencies)).toBe(EXIT_CODES.HTTP_SERVER_ERROR);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi plan cancel-trigger (registerPlanCancelTriggerCommand)', () => {
  it('calls the cancellation once with the trimmed id and prints the updated plan summary', async () => {
    const { dependencies, api, stdout } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockResolvedValue(createPlan('plan-1', { lastTriggeredResetAt: '2026-11-13T13:00:00Z' })),
    });

    expect(await runCli(plan('cancel-trigger', '--id', ' plan-1 '), dependencies)).toBe(0);
    expect(api.cancelPlanQuotaTrigger).toHaveBeenCalledExactlyOnceWith('plan-1');
    expect(stdout.join('')).toMatch(/^Quota trigger cancelled\n/);
    expect(stdout.join('')).toMatch(/^id\s+plan-1$/m);
    expect(stdout.join('')).toMatch(/^nextRun\s+/m);
  });

  it('prints the updated plan under a plan key as JSON, with the trigger fields cleared', async () => {
    const { dependencies, stdout } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockResolvedValue(
        createPlan('plan-1', { lastTriggeredResetAt: '2026-11-13T13:00:00Z', pendingQuotaTrigger: null }),
      ),
    });

    expect(await runCli(plan('cancel-trigger', '--id', 'plan-1', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(Object.keys(body)).toEqual(['plan']);
    expect(body.plan).toMatchObject({
      id: 'plan-1',
      lastTriggeredResetAt: '2026-11-13T13:00:00Z',
      pendingQuotaTrigger: null,
    });
  });

  it('succeeds with exit code 0 when no trigger is pending, and shows the plan the backend returned', async () => {
    const { dependencies, api, stdout } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockResolvedValue(createPlan('plan-1', { lastTriggeredResetAt: null })),
    });

    expect(await runCli(plan('cancel-trigger', '--id', 'plan-1'), dependencies)).toBe(0);
    expect(api.cancelPlanQuotaTrigger).toHaveBeenCalledExactlyOnceWith('plan-1');
    expect(stdout.join('')).toMatch(/^Quota trigger cancelled\n/);
  });

  it('with nothing pending, JSON carries pendingQuotaTrigger as null', async () => {
    const { dependencies, stdout } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockResolvedValue(createPlan('plan-1', { lastTriggeredResetAt: null })),
    });

    expect(await runCli(plan('cancel-trigger', '--id', 'plan-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).plan).toMatchObject({ lastTriggeredResetAt: null, pendingQuotaTrigger: null });
  });

  it('does not read or update the plan', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(plan('cancel-trigger', '--id', 'plan-1'), dependencies);

    expect(api.getPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('exits with usage code 2 and makes no backend call when --id is missing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('cancel-trigger'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.cancelPlanQuotaTrigger).not.toHaveBeenCalled();
  });

  it('exits with usage code 2 and makes no backend call for a whitespace-only --id', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(plan('cancel-trigger', '--id', ' '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.cancelPlanQuotaTrigger).not.toHaveBeenCalled();
  });

  it('maps a 400 from the backend to exit code 20', async () => {
    const { dependencies } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockRejectedValue(createApiError(400, { error: 'Invalid request.' })),
    });

    expect(await runCli(plan('cancel-trigger', '--id', 'plan-1'), dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
  });

  it('maps an unknown plan (404) to exit code 24 and prints nothing', async () => {
    const { dependencies, stdout } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockRejectedValue(createApiError(404, { error: 'Plan not found.' })),
    });

    expect(await runCli(plan('cancel-trigger', '--id', 'missing'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
  });

  it('maps an unavailable backend (503) to exit code 50', async () => {
    const { dependencies } = createDependencies({
      cancelPlanQuotaTrigger: vi.fn().mockRejectedValue(createApiError(503, { error: 'Scheduler unavailable.' })),
    });

    expect(await runCli(plan('cancel-trigger', '--id', 'plan-1'), dependencies)).toBe(EXIT_CODES.HTTP_SERVER_ERROR);
  });
});

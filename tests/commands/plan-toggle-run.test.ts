import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it, vi } from 'vitest';
import { registerPlanDisableCommand } from '../../src/commands/plan/disable';
import { registerPlanEnableCommand } from '../../src/commands/plan/enable';
import { registerPlanRunCommand } from '../../src/commands/plan/run';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createPlan, createSession } from './testHelpers';

const plan = (...args: string[]) => ['node', 'hagi', 'plan', ...args];

describe('registration functions', () => {
  it('are exported for the plan group', () => {
    expect(typeof registerPlanEnableCommand).toBe('function');
    expect(typeof registerPlanDisableCommand).toBe('function');
    expect(typeof registerPlanRunCommand).toBe('function');
  });
});

describe('hagi plan enable (registerPlanEnableCommand)', () => {
  it('reads the plan, sends one update with enabled true, and says it was enabled', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
      updatePlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
    });

    expect(await runCli(plan('enable', '--id', ' plan-1 '), dependencies)).toBe(0);
    expect(api.getPlan).toHaveBeenCalledExactlyOnceWith('plan-1');
    expect(api.updatePlan).toHaveBeenCalledExactlyOnceWith('plan-1', expect.objectContaining({ enabled: true }));
    expect(stdout.join('')).toMatch(/^Plan enabled\n/);
  });

  it('sends nothing when the plan is already enabled', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
    });

    expect(await runCli(plan('enable', '--id', 'plan-1'), dependencies)).toBe(0);
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toMatch(/^Plan was already enabled\n/);
  });

  it('prints the plan and a changed flag as JSON', async () => {
    const changed = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
      updatePlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
    });
    expect(await runCli(plan('enable', '--id', 'plan-1', '--json'), changed.dependencies)).toBe(0);
    expect(JSON.parse(changed.stdout.join(''))).toMatchObject({ plan: { id: 'plan-1', enabled: true }, changed: true });

    const unchanged = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
    });
    expect(await runCli(plan('enable', '--id', 'plan-1', '--json'), unchanged.dependencies)).toBe(0);
    expect(JSON.parse(unchanged.stdout.join(''))).toMatchObject({ plan: { enabled: true }, changed: false });
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(plan('enable', '--id', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.getPlan).not.toHaveBeenCalled();
  });

  it('fails without --id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('enable'), dependencies)).not.toBe(0);
    expect(api.getPlan).not.toHaveBeenCalled();
  });

  it('maps an unknown plan to the not-found exit code without updating', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Plan not found.' })),
    });

    expect(await runCli(plan('enable', '--id', 'missing'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('fails when the update is rejected, and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
      updatePlan: vi.fn().mockRejectedValue(createApiError(400, { error: 'Invalid plan.' })),
    });

    expect(await runCli(plan('enable', '--id', 'plan-1'), dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi plan disable (registerPlanDisableCommand)', () => {
  it('sends one update with enabled false and says it was disabled', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
      updatePlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
    });

    expect(await runCli(plan('disable', '--id', 'plan-1'), dependencies)).toBe(0);
    expect(api.updatePlan).toHaveBeenCalledExactlyOnceWith('plan-1', expect.objectContaining({ enabled: false }));
    expect(stdout.join('')).toMatch(/^Plan disabled\n/);
  });

  it('sends nothing when the plan is already disabled', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
    });

    expect(await runCli(plan('disable', '--id', 'plan-1'), dependencies)).toBe(0);
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toMatch(/^Plan was already disabled\n/);
  });

  it('prints the plan and a changed flag as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: true })),
      updatePlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
    });

    expect(await runCli(plan('disable', '--id', 'plan-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({ plan: { id: 'plan-1', enabled: false }, changed: true });
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('disable', '--id', ' '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.getPlan).not.toHaveBeenCalled();
  });

  it('maps an unknown plan to the not-found exit code', async () => {
    const { dependencies } = createDependencies({
      getPlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Plan not found.' })),
    });

    expect(await runCli(plan('disable', '--id', 'missing'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });
});

describe('hagi plan run (registerPlanRunCommand)', () => {
  it('runs the plan in the foreground and prints the created session', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(plan('run', '--id', ' plan-1 '), dependencies)).toBe(0);
    expect(api.runPlan).toHaveBeenCalledExactlyOnceWith('plan-1');
    expect(api.startPlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toMatch(/^Plan run created a session\n/);
    expect(stdout.join('')).toContain('session-3');
  });

  it('prints the created session under a session key as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      runPlan: vi.fn().mockResolvedValue(createSession('session-9', PCode_Models_SessionType.CHAT)),
    });

    expect(await runCli(plan('run', '--id', 'plan-1', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(Object.keys(body)).toEqual(['session']);
    expect(body.session.sessionId).toBe('session-9');
  });

  it('with --background starts the run and prints the accepted plan id without waiting', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(plan('run', '--id', 'plan-1', '--background'), dependencies)).toBe(0);
    expect(api.startPlan).toHaveBeenCalledExactlyOnceWith('plan-1');
    expect(api.runPlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toContain('Plan run accepted');
    expect(stdout.join('')).toContain('plan-1');
  });

  it('with --background prints the accepted payload as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      startPlan: vi.fn().mockResolvedValue({ planId: 'plan-7' }),
    });

    expect(await runCli(plan('run', '--id', 'plan-7', '--background', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ planId: 'plan-7', accepted: true });
  });

  it('never sends a plan update, so the schedule is not changed', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(plan('run', '--id', 'plan-1'), dependencies);
    await runCli(plan('run', '--id', 'plan-1', '--background'), dependencies);

    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(api.getPlan).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(plan('run', '--id', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.runPlan).not.toHaveBeenCalled();
    expect(api.startPlan).not.toHaveBeenCalled();
  });

  it('fails without --id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(plan('run', '--background'), dependencies)).not.toBe(0);
    expect(api.startPlan).not.toHaveBeenCalled();
  });

  it('maps an unknown plan to the not-found exit code in both modes', async () => {
    const foreground = createDependencies({ runPlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Plan not found.' })) });
    expect(await runCli(plan('run', '--id', 'missing'), foreground.dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);

    const background = createDependencies({ startPlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Plan not found.' })) });
    expect(await runCli(plan('run', '--id', 'missing', '--background'), background.dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });

  it('fails without success text when the backend is unreachable', async () => {
    const { dependencies, stdout } = createDependencies({
      runPlan: vi.fn().mockRejectedValue(new ConnectError('down', Code.Unavailable)),
    });

    expect(await runCli(plan('run', '--id', 'plan-1'), dependencies)).not.toBe(0);
    expect(stdout.join('')).toBe('');
  });
});

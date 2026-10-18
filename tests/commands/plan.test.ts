import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildAgentPool,
  buildFlagChanges,
  loadPlanDocument,
  mergePlan,
  stripServerFields,
} from '../../src/commands/plan/input';
import { runCli } from '../../src/main';
import { CliUsageError, EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createPlan } from './testHelpers';

describe('plan list and get commands', () => {
  it('lists plans in human mode with a schedule summary', async () => {
    const { dependencies, api, stdout, stderr } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'list'], dependencies)).toBe(0);
    expect(api.listPlans).toHaveBeenCalledOnce();
    expect(stdout.join('')).toContain('Plans (1)');
    expect(stdout.join('')).toContain('plan-1');
    expect(stdout.join('')).toContain('daily 02:00 Asia/Shanghai');
    expect(stderr.join('')).toBe('');
  });

  it('lists plans in json mode with a plans array carrying the backend fields', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'list', '--json'], dependencies)).toBe(0);
    const payload = JSON.parse(stdout.join(''));
    expect(payload.plans).toHaveLength(1);
    expect(payload.plans[0]).toMatchObject({
      id: 'plan-1',
      type: 'hagitask',
      name: 'Nightly review',
      enabled: true,
      state: 'scheduled',
      nextRunAt: '2026-05-01T18:00:00Z',
      schedule: { mode: 'recurring', timeOfDay: '02:00', repeat: { rule: 'daily' } },
      agentPool: { strategy: 'random', agents: [{ heroId: 'hero-1' }] },
      payload: { title: 'Nightly review' },
    });
  });

  it('prints an explicit message when no plans exist', async () => {
    const { dependencies, stdout } = createDependencies({
      listPlans: vi.fn().mockResolvedValue([]),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'list'], dependencies)).toBe(0);
    expect(stdout.join('')).toBe('No scheduled plans found.\n');
  });

  it('prints an empty plans array in json mode', async () => {
    const { dependencies, stdout } = createDependencies({
      listPlans: vi.fn().mockResolvedValue([]),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'list', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ plans: [] });
  });

  it('reads one plan by id in human mode', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'get', '--id', 'plan-1'], dependencies)).toBe(0);
    expect(api.getPlan).toHaveBeenCalledWith('plan-1');
    expect(stdout.join('')).toMatch(/^id\s+plan-1$/m);
    expect(stdout.join('')).toMatch(/^enabled\s+yes$/m);
    expect(stdout.join('')).toMatch(/^schedule\s+daily 02:00 Asia\/Shanghai$/m);
  });

  it('reads one plan by id in json mode under a plan field', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'get', '--id', 'plan-1', '--json'], dependencies)).toBe(0);
    const payload = JSON.parse(stdout.join(''));
    expect(payload.plan).toMatchObject({
      id: 'plan-1',
      schedule: { mode: 'recurring' },
      agentPool: { strategy: 'random' },
      payload: { title: 'Nightly review' },
    });
  });

  it('rejects a missing --id as a usage error without calling the backend', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'get'], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.getPlan).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('--id');
  });

  it('maps an unknown plan id to the not-found exit code', async () => {
    const { dependencies, stderr } = createDependencies({
      getPlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Scheduled plan not found.' })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'get', '--id', 'missing'], dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stderr.join('')).toContain('Scheduled plan not found.');
  });

  it('shows a completed plan with no next run time', async () => {
    const { dependencies, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(
        createPlan('plan-9', {
          enabled: false,
          state: 'completed',
          nextRunAt: null,
          schedule: { mode: 'once', runAt: '2026-04-20T00:00:00Z' },
        }),
      ),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'get', '--id', 'plan-9'], dependencies)).toBe(0);
    expect(stdout.join('')).toMatch(/^state\s+completed$/m);
    expect(stdout.join('')).toMatch(/^nextRun\s+-$/m);
    expect(stdout.join('')).toMatch(/^schedule\s+once 2026-04-20T00:00:00Z$/m);
  });
});

describe('plan input helpers', () => {
  function writeInput(content: string): string {
    const path = join(mkdtempSync(join(tmpdir(), 'hagi-plan-input-')), 'plan.json');
    writeFileSync(path, content);
    return path;
  }

  it('rejects array and scalar JSON documents as usage errors', async () => {
    await expect(loadPlanDocument(writeInput('[]'))).rejects.toBeInstanceOf(CliUsageError);
    await expect(loadPlanDocument(writeInput('"plan"'))).rejects.toBeInstanceOf(CliUsageError);
    await expect(loadPlanDocument(writeInput('42'))).rejects.toThrow('must be a JSON object');
  });

  it('treats a missing or unparseable file as a usage error', async () => {
    await expect(loadPlanDocument(join(tmpdir(), 'hagi-no-such-plan.json'))).rejects.toBeInstanceOf(CliUsageError);
    await expect(loadPlanDocument(writeInput('{ not json'))).rejects.toBeInstanceOf(CliUsageError);
  });

  it('strips server-owned fields and keeps the save fields', () => {
    const saved = stripServerFields({
      id: 'plan-1',
      type: 'hagitask',
      name: 'Nightly review',
      enabled: true,
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-02T00:00:00Z',
      state: 'scheduled',
      nextRunAt: '2026-05-01T18:00:00Z',
      payload: { title: 'Nightly review' },
    });

    expect(saved).toEqual({
      type: 'hagitask',
      name: 'Nightly review',
      enabled: true,
      payload: { title: 'Nightly review' },
    });
  });

  it('replaces a schedule as a whole value instead of merging into it', () => {
    const current = createPlan('plan-1');
    const merged = mergePlan(current, {
      schedule: { mode: 'once', runAt: '2026-05-04T01:00:00Z' },
    });

    expect(merged.schedule).toEqual({ mode: 'once', runAt: '2026-05-04T01:00:00Z' });
    expect(merged.agentPool).toEqual(current.agentPool);
    expect(merged.payload).toEqual(current.payload);
    expect(merged).not.toHaveProperty('id');
    expect(merged).not.toHaveProperty('nextRunAt');
  });

  it('builds the single-agent pool and only the scalar flags that were passed', () => {
    expect(buildAgentPool('hero-1')).toEqual({ strategy: 'random', agents: [{ heroId: 'hero-1' }] });
    expect(buildFlagChanges({})).toEqual({});
    expect(buildFlagChanges({ name: 'Renamed', enabled: false })).toEqual({ name: 'Renamed', enabled: false });
  });
});

let restoreStdin: (() => void) | undefined;

afterEach(() => {
  restoreStdin?.();
  restoreStdin = undefined;
});

/** Replaces process.stdin with the given content so `--input -` can be exercised. */
function withStdin(content: string): void {
  const original = Object.getOwnPropertyDescriptor(process, 'stdin');
  Object.defineProperty(process, 'stdin', { value: Readable.from([content]), configurable: true });
  restoreStdin = () => {
    if (original) {
      Object.defineProperty(process, 'stdin', original);
    }
  };
}

function writePlanFile(content: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'hagi-plan-write-'));
  const path = join(dir, 'plan.json');
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content));
  return path;
}

/** Save-request body a recurring HagiTask plan document produces, before any flag overrides. */
const recurringDocument = {
  type: 'hagitask',
  name: 'Nightly review',
  schedule: {
    mode: 'recurring',
    timeZone: 'Asia/Shanghai',
    startDate: '2026-04-01',
    endDate: null,
    timeOfDay: '02:00',
    repeat: { rule: 'daily', weekdays: null },
  },
  agentPool: { strategy: 'random', agents: [{ heroId: 'hero-1' }] },
  payload: { title: 'Nightly review', message: 'Review the day', projectId: 'project-1' },
};

describe('plan create command', () => {
  it('sends the document as the create body from a file', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const path = writePlanFile(recurringDocument);

    expect(await runCli(['node', 'hagi', 'plan', 'create', '--input', path], dependencies)).toBe(0);
    expect(api.createPlan).toHaveBeenCalledOnce();
    expect(api.createPlan).toHaveBeenCalledWith({ enabled: true, ...recurringDocument });
    expect(stdout.join('')).toContain('Plan created');
  });

  it('sends the same body when the document comes from stdin', async () => {
    const fromFile = createDependencies();
    await runCli(['node', 'hagi', 'plan', 'create', '--input', writePlanFile(recurringDocument)], fromFile.dependencies);

    withStdin(JSON.stringify(recurringDocument));
    const fromStdin = createDependencies();
    expect(await runCli(['node', 'hagi', 'plan', 'create', '--input', '-'], fromStdin.dependencies)).toBe(0);
    expect(fromStdin.api.createPlan).toHaveBeenCalledWith(
      (fromFile.api.createPlan as ReturnType<typeof vi.fn>).mock.calls[0][0],
    );
  });

  it('enables the plan when the document and flags say nothing about enabled', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(['node', 'hagi', 'plan', 'create', '--input', writePlanFile(recurringDocument)], dependencies);
    expect(api.createPlan).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('creates the plan disabled with --disabled', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(['node', 'hagi', 'plan', 'create', '--input', writePlanFile(recurringDocument), '--disabled'], dependencies);
    expect(api.createPlan).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('keeps a document enabled value of false when --disabled is not passed', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(
      ['node', 'hagi', 'plan', 'create', '--input', writePlanFile({ ...recurringDocument, enabled: false })],
      dependencies,
    );
    expect(api.createPlan).toHaveBeenCalledWith(expect.objectContaining({ enabled: false }));
  });

  it('applies --name and --hero-id over the document', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(
      ['node', 'hagi', 'plan', 'create', '--input', writePlanFile(recurringDocument), '--name', 'Renamed', '--hero-id', 'hero-9'],
      dependencies,
    );
    expect(api.createPlan).toHaveBeenCalledWith({
      enabled: true,
      ...recurringDocument,
      name: 'Renamed',
      agentPool: { strategy: 'random', agents: [{ heroId: 'hero-9' }] },
    });
  });

  it('drops server-owned fields found in the document', async () => {
    const { dependencies, api } = createDependencies();
    const path = writePlanFile({
      ...recurringDocument,
      id: 'old-id',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-02T00:00:00Z',
      state: 'completed',
      nextRunAt: null,
    });

    await runCli(['node', 'hagi', 'plan', 'create', '--input', path], dependencies);
    const body = (api.createPlan as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(body).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('createdAt');
    expect(body).not.toHaveProperty('updatedAt');
    expect(body).not.toHaveProperty('state');
    expect(body).not.toHaveProperty('nextRunAt');
  });

  it('rejects missing, unreadable and non-object input as usage errors without calling the backend', async () => {
    const missingFlag = createDependencies();
    expect(await runCli(['node', 'hagi', 'plan', 'create'], missingFlag.dependencies)).toBe(EXIT_CODES.USAGE);

    const unreadable = createDependencies();
    expect(await runCli(
      ['node', 'hagi', 'plan', 'create', '--input', join(tmpdir(), 'hagi-missing-plan.json')],
      unreadable.dependencies,
    )).toBe(EXIT_CODES.USAGE);

    const nonObject = createDependencies();
    expect(await runCli(
      ['node', 'hagi', 'plan', 'create', '--input', writePlanFile([recurringDocument])],
      nonObject.dependencies,
    )).toBe(EXIT_CODES.USAGE);
    expect(nonObject.stderr.join('')).toContain('must be a JSON object');

    for (const { api } of [missingFlag, unreadable, nonObject]) {
      expect(api.createPlan).not.toHaveBeenCalled();
    }
  });

  it('prints each validation problem and exits 20 when the backend rejects the plan', async () => {
    const { dependencies, stderr } = createDependencies({
      createPlan: vi.fn().mockRejectedValue(
        createApiError(400, {
          error: 'Scheduled plan is invalid.',
          errors: [
            { field: 'agentPool', message: 'A HagiTask plan needs an agent pool with one agent.' },
            { field: 'schedule.timeOfDay', message: 'Use HH:mm.' },
          ],
        }),
      ),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'create', '--input', writePlanFile(recurringDocument)], dependencies))
      .toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stderr.join('')).toBe(
      'Scheduled plan is invalid. (status=400)\n' +
        '  - agentPool: A HagiTask plan needs an agent pool with one agent.\n' +
        '  - schedule.timeOfDay: Use HH:mm.\n',
    );
  });
});

describe('plan update command', () => {
  const current = createPlan('plan-1');
  const currentSaveFields = {
    type: current.type,
    name: current.name,
    enabled: current.enabled,
    schedule: current.schedule,
    agentPool: current.agentPool,
    payload: current.payload,
  };

  it('renames a plan and sends every other field unchanged', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--name', 'Renamed'], dependencies)).toBe(0);
    expect(api.getPlan).toHaveBeenCalledWith('plan-1');
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', { ...currentSaveFields, name: 'Renamed' });
    expect(stdout.join('')).toContain('Plan updated');
  });

  it('omits server-owned fields from the replacement body', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--name', 'Renamed'], dependencies);
    const body = (api.updatePlan as ReturnType<typeof vi.fn>).mock.calls[0][1];
    for (const field of ['id', 'createdAt', 'updatedAt', 'state', 'nextRunAt']) {
      expect(body).not.toHaveProperty(field);
    }
  });

  it('replaces only the top-level fields present in the document', async () => {
    const { dependencies, api } = createDependencies();
    const path = writePlanFile({ schedule: { mode: 'once', runAt: '2026-05-04T01:00:00Z' } });

    expect(await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--input', path], dependencies)).toBe(0);
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', {
      ...currentSaveFields,
      schedule: { mode: 'once', runAt: '2026-05-04T01:00:00Z' },
    });
  });

  it('applies --hero-id as a single-agent pool', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--hero-id', 'hero-7'], dependencies);
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', {
      ...currentSaveFields,
      agentPool: { strategy: 'random', agents: [{ heroId: 'hero-7' }] },
    });
  });

  it('sets the enabled flag with --enabled and --disabled', async () => {
    const enabling = createDependencies({ getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })) });
    await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--enabled'], enabling.dependencies);
    expect(enabling.api.updatePlan).toHaveBeenCalledWith('plan-1', expect.objectContaining({ enabled: true }));

    const disabling = createDependencies();
    await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--disabled'], disabling.dependencies);
    expect(disabling.api.updatePlan).toHaveBeenCalledWith('plan-1', expect.objectContaining({ enabled: false }));
  });

  it('rejects --enabled together with --disabled before any request', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'plan', 'update', '--id', 'plan-1', '--enabled', '--disabled'],
      dependencies,
    )).toBe(EXIT_CODES.USAGE);
    expect(api.getPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
  });

  it('rejects an update with nothing to change without sending a PUT', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'update', '--id', 'plan-1'], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Provide at least one change');
  });

  it('exits 24 without a PUT when the plan cannot be read', async () => {
    const { dependencies, api } = createDependencies({
      getPlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Scheduled plan not found.' })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'update', '--id', 'missing', '--name', 'X'], dependencies))
      .toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(api.updatePlan).not.toHaveBeenCalled();
  });
});

describe('plan enable and disable commands', () => {
  it('disables an enabled plan and sends a replacement equal to the plan except enabled', async () => {
    const { dependencies, api, stdout } = createDependencies({
      updatePlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'disable', '--id', 'plan-1'], dependencies)).toBe(0);
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', {
      type: 'hagitask',
      name: 'Nightly review',
      enabled: false,
      schedule: createPlan('plan-1').schedule,
      agentPool: createPlan('plan-1').agentPool,
      payload: createPlan('plan-1').payload,
    });
    expect(stdout.join('')).toContain('Plan disabled');
    expect(stdout.join('')).toMatch(/^enabled\s+no$/m);
  });

  it('sends no update when the plan is already enabled', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'enable', '--id', 'plan-1'], dependencies)).toBe(0);
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toContain('Plan was already enabled');
  });

  it('enables a disabled plan in json mode with changed set', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'enable', '--id', 'plan-1', '--json'], dependencies)).toBe(0);
    expect(api.updatePlan).toHaveBeenCalledWith('plan-1', expect.objectContaining({ enabled: true }));
    expect(JSON.parse(stdout.join(''))).toMatchObject({ plan: { id: 'plan-1', enabled: true }, changed: true });
  });

  it('sends no update when disabling a plan that is already disabled', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getPlan: vi.fn().mockResolvedValue(createPlan('plan-1', { enabled: false })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'disable', '--id', 'plan-1', '--json'], dependencies)).toBe(0);
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(JSON.parse(stdout.join(''))).toMatchObject({ changed: false });
  });
});

describe('plan delete command', () => {
  it('reports the deleted plan in human output', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'delete', '--id', 'plan-1'], dependencies)).toBe(0);
    expect(api.deletePlan).toHaveBeenCalledWith('plan-1');
    expect(stdout.join('')).toContain('Plan deleted');
    expect(stdout.join('')).toMatch(/^planId\s+plan-1$/m);
  });

  it('prints planId and deleted true in json mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'delete', '--id', 'plan-1', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ planId: 'plan-1', deleted: true });
  });

  it('maps an unknown plan to exit 24', async () => {
    const { dependencies } = createDependencies({
      deletePlan: vi.fn().mockRejectedValue(createApiError(404, { error: 'Scheduled plan not found.' })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'delete', '--id', 'missing'], dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });
});

describe('plan run command', () => {
  it('creates a session now and prints its summary without sending an update', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'run', '--id', 'plan-1'], dependencies)).toBe(0);
    expect(api.runPlan).toHaveBeenCalledWith('plan-1');
    expect(api.startPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toContain('Plan run created a session');
    expect(stdout.join('')).toMatch(/^sessionId\s+session-3$/m);
  });

  it('prints the session under a session field in json mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'run', '--id', 'plan-1', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).session).toMatchObject({ sessionId: 'session-3' });
  });

  it('starts the run in the background and prints the accepted plan id', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'run', '--id', 'plan-1', '--background'], dependencies)).toBe(0);
    expect(api.startPlan).toHaveBeenCalledWith('plan-1');
    expect(api.runPlan).not.toHaveBeenCalled();
    expect(api.updatePlan).not.toHaveBeenCalled();
    expect(stdout.join('')).toMatch(/^planId\s+plan-1$/m);
    expect(stdout.join('')).toMatch(/^accepted\s+true$/m);
  });

  it('prints planId and accepted true for a background run in json mode', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'plan', 'run', '--id', 'plan-1', '--background', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ planId: 'plan-1', accepted: true });
  });

  it.each([
    ['400 for the foreground run', 'runPlan', 400, EXIT_CODES.HTTP_BAD_REQUEST, []],
    ['404 for the foreground run', 'runPlan', 404, EXIT_CODES.HTTP_NOT_FOUND, []],
    ['503 for the background start', 'startPlan', 503, EXIT_CODES.HTTP_SERVER_ERROR, ['--background']],
  ])('maps %s to its exit code', async (_label, method, status, exitCode, extraArgs) => {
    const { dependencies } = createDependencies({
      [method]: vi.fn().mockRejectedValue(createApiError(status, { error: 'Backend refused the run.' })),
    });

    expect(await runCli(['node', 'hagi', 'plan', 'run', '--id', 'plan-1', ...extraArgs], dependencies)).toBe(exitCode);
  });
});

describe('plan README examples', () => {
  it('accepts every JSON example in the Plan Commands section as a plan document', async () => {
    const readme = readFileSync(fileURLToPath(new URL('../../README.md', import.meta.url)), 'utf8');
    const section = readme.slice(readme.indexOf('## Plan Commands'), readme.indexOf('## Skills Commands'));
    const examples = [...section.matchAll(/```json\n([\s\S]*?)```/g)].map(match => match[1]);

    expect(examples).toHaveLength(2);
    for (const example of examples) {
      const document = await loadPlanDocument(writePlanFile(example));
      expect(document).toHaveProperty('type');
      expect(document).toHaveProperty('schedule');
      expect(document).toHaveProperty('payload');
    }
  });
});

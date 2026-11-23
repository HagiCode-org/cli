import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSagaSessionAction,
  preflightSessionCreate,
  SESSION_CREATE_COMMAND,
  type SessionCreateOptions,
} from '../../src/commands/saga/session';
import { CliSagaRefusalError, CliUsageError } from '../../src/runtime/errors';
import { claimExecution } from '../../src/runtime/saga/ownership';

// The real context resolves a backend base URL from flags, env and the user's config file; the action only needs api and io.
vi.mock('../../src/runtime/commandContext', async importOriginal => ({
  ...(await importOriginal<typeof import('../../src/runtime/commandContext')>()),
  createCommandContext: (command: Command, dependencies: { api: unknown; io: unknown }) => ({
    api: dependencies.api,
    io: dependencies.io,
    outputJson: command.optsWithGlobals<{ json?: boolean }>().json === true,
  }),
}));

const HERO_GUID = '3f2b8c1e-9d4a-4e7b-8a51-0c6d2e9f7a13';

const baseOptions = (overrides: Partial<SessionCreateOptions> = {}): SessionCreateOptions => ({
  path: '/projects/demo',
  saga: 'demo',
  title: 'T1 implementation',
  role: 'implementation',
  master: 'master-1',
  ...overrides,
});

const baseEnv = (overrides: Record<string, string> = {}): NodeJS.ProcessEnv => ({ SAGA_EXECUTION_TOKEN: 'exec-token', ...overrides });

describe('preflightSessionCreate (src/commands/saga/session.ts)', () => {
  it('returns the trimmed request for valid options', () => {
    const request = preflightSessionCreate(
      baseOptions({ saga: ' demo ', title: '  T1  ', item: ' T1 ', master: ' master-1 ' }),
      baseEnv(),
    );

    expect(request).toEqual({
      sagaId: 'demo',
      title: 'T1',
      role: 'implementation',
      masterSessionId: 'master-1',
      item: 'T1',
      hero: undefined,
      executionToken: 'exec-token',
      selector: { kind: 'path', value: '/projects/demo' },
    });
  });

  it('accepts both worker roles and rejects anything else', () => {
    expect(preflightSessionCreate(baseOptions({ role: 'verification' }), baseEnv()).role).toBe('verification');
    expect(() => preflightSessionCreate(baseOptions({ role: 'planner' }), baseEnv())).toThrow('--role must be one of implementation, verification.');
    expect(() => preflightSessionCreate(baseOptions({ role: undefined }), baseEnv())).toThrow(CliUsageError);
  });

  it.each(['saga', 'title'] as const)('requires a nonblank --%s', field => {
    expect(() => preflightSessionCreate(baseOptions({ [field]: '   ' }), baseEnv())).toThrow(`nonblank --${field}`);
    expect(() => preflightSessionCreate(baseOptions({ [field]: undefined }), baseEnv())).toThrow(`nonblank --${field}`);
  });

  it.each(['a/b', 'a\\b', '.', '..', 'a\0b'])('refuses the path-unsafe saga id %j', saga => {
    expect(() => preflightSessionCreate(baseOptions({ saga }), baseEnv())).toThrow(/must not contain a path separator or a traversal segment/);
  });

  it('applies the same path-safety rule to --item and rejects a blank one', () => {
    expect(() => preflightSessionCreate(baseOptions({ item: '../x' }), baseEnv())).toThrow('--item must not contain');
    expect(() => preflightSessionCreate(baseOptions({ item: ' ' }), baseEnv())).toThrow('nonblank --item');
  });

  it('takes the master session from the flag, else from HAGI_SESSION_ID, and blank counts as missing', () => {
    expect(preflightSessionCreate(baseOptions({ master: undefined }), baseEnv({ HAGI_SESSION_ID: ' env-master ' })).masterSessionId).toBe('env-master');
    expect(preflightSessionCreate(baseOptions({ master: 'flag-master' }), baseEnv({ HAGI_SESSION_ID: 'env-master' })).masterSessionId).toBe('flag-master');
    expect(preflightSessionCreate(baseOptions({ master: '  ' }), baseEnv({ HAGI_SESSION_ID: 'env-master' })).masterSessionId).toBe('env-master');
    expect(() => preflightSessionCreate(baseOptions({ master: '  ' }), baseEnv())).toThrow(/--master <session-id>, or HAGI_SESSION_ID/);
  });

  it('parses --hero as an ID for a GUID and as a name otherwise', () => {
    expect(preflightSessionCreate(baseOptions({ hero: HERO_GUID }), baseEnv()).hero).toEqual({ heroId: HERO_GUID });
    expect(preflightSessionCreate(baseOptions({ hero: ' Ada ' }), baseEnv()).hero).toEqual({ heroName: 'Ada' });
    expect(() => preflightSessionCreate(baseOptions({ hero: '  ' }), baseEnv())).toThrow(CliUsageError);
  });

  it('refuses --token because the execution token comes only from the environment', () => {
    expect(() => preflightSessionCreate(baseOptions({ token: 'bearer' }), baseEnv())).toThrow(/SAGA_EXECUTION_TOKEN/);
  });

  it('requires a nonblank SAGA_EXECUTION_TOKEN', () => {
    expect(() => preflightSessionCreate(baseOptions(), {})).toThrow('requires SAGA_EXECUTION_TOKEN');
    expect(() => preflightSessionCreate(baseOptions(), { SAGA_EXECUTION_TOKEN: '  ' })).toThrow('requires SAGA_EXECUTION_TOKEN');
  });

  it('requires exactly one project selector', () => {
    expect(() => preflightSessionCreate(baseOptions({ path: undefined }), baseEnv())).toThrow('exactly one of --path');
    expect(() => preflightSessionCreate(baseOptions({ projectId: 'p1' }), baseEnv())).toThrow('exactly one of --path');
    expect(preflightSessionCreate(baseOptions({ path: undefined, projectId: ' p1 ' }), baseEnv()).selector).toEqual({
      kind: 'project-id',
      value: 'p1',
    });
  });

  it('reports the saga id problem before the later ones', () => {
    expect(() => preflightSessionCreate(baseOptions({ saga: 'a/b', title: '', role: 'x' }), {})).toThrow('--saga');
  });
});

describe('createSagaSessionAction (src/commands/saga/session.ts)', () => {
  type Api = {
    listProjects: ReturnType<typeof vi.fn>;
    createChatSession: ReturnType<typeof vi.fn>;
  };

  let workspace: string;
  let sagaRoot: string;
  let stdout: string[];
  let api: Api;

  const recordPath = () => path.join(sagaRoot, 'demo', 'runtime', 'sessions.md');

  const run = (options: Partial<SessionCreateOptions> = {}, env: NodeJS.ProcessEnv = baseEnv()) => {
    const merged = baseOptions({ path: workspace, ...options });
    const command = { optsWithGlobals: () => merged } as unknown as Command;
    const dependencies = { api, env, io: { stdout: (text: string) => stdout.push(text), stderr: vi.fn() } } as never;
    return createSagaSessionAction(dependencies).call(command);
  };

  beforeEach(() => {
    workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-session-symbols-')));
    sagaRoot = path.join(workspace, '.hagicode', 'sagas');
    mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
    stdout = [];
    api = {
      listProjects: vi.fn().mockResolvedValue({ projects: [{ id: 'project-1', path: workspace }] }),
      createChatSession: vi.fn().mockResolvedValue({
        sessionId: 'worker-1',
        title: 'T1 implementation',
        projectId: 'project-1',
        userMetadata: { 'saga.id': 'demo' },
      }),
    };
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('creates the chat session with saga metadata and appends one record line', async () => {
    await run({ item: 'T1' });

    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    expect(api.createChatSession).toHaveBeenCalledWith({
      title: 'T1 implementation',
      projectId: 'project-1',
      metadata: {
        'saga.id': 'demo',
        'saga.role': 'worker',
        'saga.worker': 'implementation',
        'saga.master': 'master-1',
        'saga.item': 'T1',
      },
    });
    const record = readFileSync(recordPath(), 'utf8');
    expect(record).toMatch(/^- worker-1 \| \S+ \| implementation \| T1 \| T1 implementation\n$/);
  });

  it('spreads the hero reference into the creation request only when --hero is given', async () => {
    await run({ hero: 'Ada' });

    expect(api.createChatSession).toHaveBeenCalledWith(expect.objectContaining({ heroName: 'Ada' }));

    api.createChatSession.mockClear();
    await run();
    expect(Object.keys(api.createChatSession.mock.calls[0][0])).toEqual(['title', 'projectId', 'metadata']);
  });

  it('prints the human summary naming the session and the record path', async () => {
    await run();

    expect(stdout).toHaveLength(1);
    expect(stdout[0]).toContain('session created: worker-1');
    expect(stdout[0]).toContain('saga          demo');
    expect(stdout[0]).toContain(`recorded in   ${recordPath()}`);
  });

  it('prints the result as JSON when --json is on', async () => {
    await run({ json: true } as Partial<SessionCreateOptions>);

    const result = JSON.parse(stdout[0]);
    expect(result).toMatchObject({ sagaId: 'demo', command: SESSION_CREATE_COMMAND, ok: true, record: recordPath() });
    expect(result.session.sessionId).toBe('worker-1');
  });

  it('creates the runtime directory with the ignore rule before the session exists', async () => {
    await run();

    expect(existsSync(path.join(sagaRoot, 'demo', 'runtime'))).toBe(true);
    expect(existsSync(path.join(sagaRoot, '.gitignore'))).toBe(true);
  });

  it('fails a usage error before any request when the arguments are invalid', async () => {
    await expect(run({ role: 'planner' })).rejects.toBeInstanceOf(CliUsageError);

    expect(api.listProjects).not.toHaveBeenCalled();
    expect(api.createChatSession).not.toHaveBeenCalled();
    expect(stdout).toEqual([]);
  });

  it('fails for a Saga that does not exist without creating a session', async () => {
    await expect(run({ saga: 'missing' })).rejects.toThrow('Saga "missing" was not found.');

    expect(api.createChatSession).not.toHaveBeenCalled();
  });

  it('refuses with the reasons, and creates nothing, when the project path is not registered', async () => {
    api.listProjects.mockResolvedValue({ projects: [] });

    const error = await run().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(CliSagaRefusalError);
    expect((error as CliSagaRefusalError).reported).toBe(true);
    expect(stdout[0]).toContain('refused: session create demo');
    expect(stdout[0]).toContain('no registered project has the path');
    expect(api.createChatSession).not.toHaveBeenCalled();
  });

  it('prints a JSON refusal when the execution token does not match the lock', async () => {
    claimExecution(sagaRoot, 'demo', 'owner-session');

    const error = await run({ json: true } as Partial<SessionCreateOptions>, baseEnv({ SAGA_EXECUTION_TOKEN: 'wrong' })).catch(
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(CliSagaRefusalError);
    expect(JSON.parse(stdout[0])).toMatchObject({ sagaId: 'demo', command: SESSION_CREATE_COMMAND, ok: false });
    expect(api.createChatSession).not.toHaveBeenCalled();
  });

  it('accepts the claimed execution token for a locked Saga', async () => {
    const lock = claimExecution(sagaRoot, 'demo', 'owner-session');

    await run({}, baseEnv({ SAGA_EXECUTION_TOKEN: lock.token }));

    expect(api.createChatSession).toHaveBeenCalledTimes(1);
  });

  it('reports a failed record write with the created session ID, as a reported refusal', async () => {
    // A directory where sessions.md must be makes the append fail after the session was created.
    mkdirSync(recordPath(), { recursive: true });

    const error = await run({ json: true } as Partial<SessionCreateOptions>).catch((caught: unknown) => caught);

    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    expect(error).toBeInstanceOf(CliSagaRefusalError);
    expect((error as CliSagaRefusalError).reported).toBe(true);
    const result = JSON.parse(stdout[0]);
    expect(result.ok).toBe(false);
    expect(result.session.sessionId).toBe('worker-1');
    expect(result.errors[0]).toContain('session worker-1 was created but its record could not be written');
    expect(stdout).toHaveLength(1);
  });

  it('does not swallow backend errors from session creation', async () => {
    api.createChatSession.mockRejectedValue(new Error('backend exploded'));

    await expect(run()).rejects.toThrow('backend exploded');

    expect(existsSync(recordPath())).toBe(false);
    expect(stdout).toEqual([]);
  });
});

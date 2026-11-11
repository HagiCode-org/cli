import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import type { HagiApi } from '../../src/runtime/hagiApi';
import { createApiError, createDependencies, createProject, createSession } from './testHelpers';

const TOKEN = 'execution-token-under-test';
const DEFAULT_ENV: Record<string, string | undefined> = { SAGA_EXECUTION_TOKEN: TOKEN };

let workspace: string;
let projectPath: string;
let sagaRoot: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-session-')));
  projectPath = path.join(workspace, 'Project With Spaces');
  mkdirSync(projectPath);
  sagaRoot = path.join(projectPath, '.hagicode', 'sagas');
  mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

function sagaDirectory(id = 'demo'): string {
  return path.join(sagaRoot, id);
}

function recordFile(id = 'demo'): string {
  return path.join(sagaDirectory(id), 'runtime', 'sessions.md');
}

function writeLock(token: string, id = 'demo'): void {
  mkdirSync(path.join(sagaDirectory(id), 'runtime'), { recursive: true });
  writeFileSync(
    path.join(sagaDirectory(id), 'runtime', 'execute.lock'),
    JSON.stringify({ token, ownerSession: 'owner-session', createdAt: '2026-11-08T00:00:00Z' }),
  );
}

/** The fake backend echoes the creation metadata back as `userMetadata`, as the real backend does. */
function echoingCreateChatSession() {
  return vi.fn(async (body: { metadata?: Record<string, string> }) => ({
    ...createSession('worker-1', PCode_Models_SessionType.CHAT),
    userMetadata: body.metadata,
  }));
}

type RunOverrides = {
  env?: Record<string, string | undefined>;
  projects?: Array<{ id: string; path: string }>;
  createChatSession?: HagiApi['createChatSession'];
};

async function sessionCreate(args: string[], overrides: RunOverrides = {}) {
  const createChatSession = overrides.createChatSession ?? echoingCreateChatSession();
  const harness = createDependencies({
    createChatSession,
    listProjects: vi.fn().mockResolvedValue({
      projects: overrides.projects ?? [{ ...createProject('p-1'), path: projectPath }],
    }),
  });
  const env = { ...DEFAULT_ENV, ...overrides.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) {
      delete harness.dependencies.env[key];
    } else {
      harness.dependencies.env[key] = value;
    }
  }

  const exitCode = await runCli(['node', 'hagi', 'saga', 'session', 'create', ...args], harness.dependencies);
  return {
    exitCode,
    stdout: harness.stdout.join(''),
    stderr: harness.stderr.join(''),
    api: harness.api,
    createChatSession,
  };
}

/** Arguments that create a valid Worker for `demo` in the project path. */
function validArgs(extra: string[] = []): string[] {
  return [
    '--saga', 'demo',
    '--path', projectPath,
    '--title', 'T1 implementation',
    '--role', 'implementation',
    '--master', 'm-1',
    '--item', 'T1',
    ...extra,
  ];
}

function expectNoBackendCall(result: { api: HagiApi }): void {
  expect(result.api.listProjects).not.toHaveBeenCalled();
}

describe('saga session create: usage checks (exit 2, no request)', () => {
  it.each(['--saga', '--title', '--role', '--master'])('refuses a missing %s', async flag => {
    // Arguments are built inside the test: projectPath is only set by beforeEach.
    const args = validArgs();
    args.splice(args.indexOf(flag), 2);

    const result = await sessionCreate(args);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expectNoBackendCall(result);
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(recordFile())).toBe(false);
  });

  it('refuses an unknown role and lists the two accepted values', async () => {
    const result = await sessionCreate(validArgs().map(value => (value === 'implementation' ? 'reviewer' : value)));

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('implementation, verification');
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it.each([
    ['--master', ''],
    ['--item', ''],
    ['--title', '   '],
  ])('refuses a blank %s value without sending a request', async (flag, value) => {
    const args = validArgs();
    args[args.indexOf(flag) + 1] = value;

    const result = await sessionCreate(args);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expectNoBackendCall(result);
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it.each([
    ['--saga', '..'],
    ['--saga', '../escape'],
    ['--item', '../x'],
    ['--item', 'a/b'],
  ])('refuses a traversal %s value %s before any file access', async (flag, value) => {
    const args = validArgs();
    args[args.indexOf(flag) + 1] = value;

    const result = await sessionCreate(args);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(path.join(workspace, 'escape'))).toBe(false);
  });

  it('refuses a missing or ambiguous selector with exit 2 and no backend call', async () => {
    const neither = await sessionCreate(['--saga', 'demo', '--title', 'x', '--role', 'implementation', '--master', 'm-1']);
    expect(neither.exitCode).toBe(EXIT_CODES.USAGE);
    expectNoBackendCall(neither);

    const both = await sessionCreate(validArgs(['--project-id', 'p-1']));
    expect(both.exitCode).toBe(EXIT_CODES.USAGE);
    expectNoBackendCall(both);
    expect(both.createChatSession).not.toHaveBeenCalled();
  });
});

describe('saga session create: execution token', () => {
  it('refuses --token with --path before any backend call', async () => {
    const result = await sessionCreate(validArgs(['--token', 'bearer-value']));

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('SAGA_EXECUTION_TOKEN');
    expectNoBackendCall(result);
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it('refuses --token with --project-id before any backend call', async () => {
    const result = await sessionCreate(
      ['--saga', 'demo', '--project-id', 'p-1', '--title', 'x', '--role', 'implementation', '--master', 'm-1', '--token', 'bearer-value'],
    );

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.api.listProjects).not.toHaveBeenCalled();
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it('refuses a missing SAGA_EXECUTION_TOKEN with exit 2 and sends no request', async () => {
    const result = await sessionCreate(validArgs(), { env: { SAGA_EXECUTION_TOKEN: undefined } });

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('SAGA_EXECUTION_TOKEN');
    expectNoBackendCall(result);
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(recordFile())).toBe(false);
  });

  it('refuses an empty SAGA_EXECUTION_TOKEN the same way', async () => {
    const result = await sessionCreate(validArgs(), { env: { SAGA_EXECUTION_TOKEN: '' } });

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it('refuses a wrong lock token with exit 1, creates nothing and leaves the runtime unchanged', async () => {
    writeLock('the-real-holder-token');
    const lockBefore = readFileSync(path.join(sagaDirectory(), 'runtime', 'execute.lock'), 'utf8');

    const result = await sessionCreate(validArgs(), { env: { SAGA_EXECUTION_TOKEN: 'wrong-token' } });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.stderr + result.stdout).toContain('owner-session');
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(recordFile())).toBe(false);
    expect(readFileSync(path.join(sagaDirectory(), 'runtime', 'execute.lock'), 'utf8')).toBe(lockBefore);
  });

  it('accepts the holder token of the lock', async () => {
    writeLock(TOKEN);

    const result = await sessionCreate(validArgs());

    expect(result.exitCode).toBe(0);
    expect(result.createChatSession).toHaveBeenCalledOnce();
  });
});

describe('saga session create: project and Saga resolution', () => {
  it('reports a --path that matches no registered project with exit 1 and creates nothing', async () => {
    const result = await sessionCreate(validArgs(), { projects: [{ id: 'p-other', path: path.join(workspace, 'elsewhere') }] });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.stderr + result.stdout).toContain('no registered project has the path');
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it('refuses several registered projects that share the path and lists their IDs', async () => {
    const result = await sessionCreate(validArgs(), {
      projects: [
        { id: 'dup-a', path: projectPath },
        { id: 'dup-b', path: projectPath },
      ],
    });

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.stderr + result.stdout).toContain('dup-a, dup-b');
    expect(result.createChatSession).not.toHaveBeenCalled();
  });

  it('creates the session in the project that --path matches', async () => {
    const result = await sessionCreate(validArgs(), {
      projects: [
        { id: 'p-missing', path: path.join(workspace, 'not-here') },
        { id: 'p-real', path: projectPath },
      ],
    });

    expect(result.exitCode).toBe(0);
    expect(result.createChatSession).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p-real' }));
  });

  it('creates the session in the project named by --project-id', async () => {
    const result = await sessionCreate(
      ['--saga', 'demo', '--project-id', 'p-1', '--title', 'T', '--role', 'verification', '--master', 'm-1'],
      { projects: [{ id: 'p-1', path: projectPath }] },
    );

    expect(result.exitCode).toBe(0);
    expect(result.createChatSession).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'p-1' }));
  });

  it('exits 24 for an unknown Saga and creates no session', async () => {
    const result = await sessionCreate(validArgs().map(value => (value === 'demo' ? 'missing-saga' : value)));

    expect(result.exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(sagaDirectory('missing-saga'))).toBe(false);
  });
});

describe('saga session create: request metadata', () => {
  it('sends the five saga.* entries when an item is given', async () => {
    const result = await sessionCreate(validArgs());

    expect(result.createChatSession).toHaveBeenCalledWith({
      title: 'T1 implementation',
      projectId: 'p-1',
      metadata: {
        'saga.id': 'demo',
        'saga.role': 'worker',
        'saga.worker': 'implementation',
        'saga.master': 'm-1',
        'saga.item': 'T1',
      },
    });
  });

  it('sends exactly four entries and no saga.item without an item', async () => {
    const args = validArgs();
    const itemIndex = args.indexOf('--item');
    args.splice(itemIndex, 2);

    const result = await sessionCreate(args);

    const body = result.createChatSession.mock.calls[0][0] as { metadata: Record<string, string> };
    expect(Object.keys(body.metadata)).toEqual(['saga.id', 'saga.role', 'saga.worker', 'saga.master']);
  });

  it('passes the backend rejection through, with no record written', async () => {
    const result = await sessionCreate(validArgs(), {
      createChatSession: vi.fn().mockRejectedValue(createApiError(400, { error: 'metadata key is invalid' })),
    });

    expect(result.exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(result.stderr).toContain('metadata key is invalid');
    expect(existsSync(recordFile())).toBe(false);
  });
});

describe('saga session create: record and redirected targets', () => {
  it('writes one record line when sessions.md is missing', async () => {
    const result = await sessionCreate(validArgs());

    expect(result.exitCode).toBe(0);
    expect(readFileSync(recordFile(), 'utf8')).toMatch(
      /^- worker-1 \| \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ \| implementation \| T1 \| T1 implementation\n$/,
    );
  });

  it('keeps earlier content and appends the new line after it', async () => {
    mkdirSync(path.join(sagaDirectory(), 'runtime'), { recursive: true });
    writeFileSync(recordFile(), '# Sessions\n- old-1 | 2026-11-01T00:00:00Z | implementation | T0 | earlier');

    const result = await sessionCreate(validArgs());

    expect(result.exitCode).toBe(0);
    const text = readFileSync(recordFile(), 'utf8');
    expect(text.startsWith('# Sessions\n- old-1 | 2026-11-01T00:00:00Z | implementation | T0 | earlier\n- worker-1 | ')).toBe(true);
    expect(text.split('\n').filter(line => line.startsWith('- worker-1 |'))).toHaveLength(1);
  });

  it('refuses a redirected runtime directory before creating a session', async () => {
    const outside = path.join(workspace, 'outside');
    mkdirSync(outside);
    symlinkSync(outside, path.join(sagaDirectory(), 'runtime'), 'dir');

    const result = await sessionCreate(validArgs());

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(path.join(outside, 'sessions.md'))).toBe(false);
  });

  it('reports a failed record write after creation: exit 1, the session ID named, JSON ok false', async () => {
    // A directory where sessions.md should be: the target check passes, the creation runs, and the append then fails.
    mkdirSync(recordFile(), { recursive: true });

    const result = await sessionCreate(validArgs(['--json']));

    expect(result.createChatSession).toHaveBeenCalledOnce();
    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    const body = JSON.parse(result.stdout);
    expect(body).toMatchObject({ sagaId: 'demo', command: 'session create', ok: false });
    expect(body.session.sessionId).toBe('worker-1');
    expect(body.errors.join(' ')).toContain('worker-1');
  });

  it('human output of a failed record names the created session ID', async () => {
    mkdirSync(recordFile(), { recursive: true });

    const result = await sessionCreate(validArgs());

    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(result.stdout).toContain('worker-1');
  });
});

describe('saga session create: output and secrecy', () => {
  it('prints JSON with session.userMetadata on success', async () => {
    const result = await sessionCreate(validArgs(['--json']));

    expect(result.exitCode).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body).toMatchObject({ sagaId: 'demo', command: 'session create', ok: true });
    expect(body.session.sessionId).toBe('worker-1');
    expect(body.session.userMetadata).toEqual({
      'saga.id': 'demo',
      'saga.role': 'worker',
      'saga.worker': 'implementation',
      'saga.master': 'm-1',
      'saga.item': 'T1',
    });
  });

  it('prints the human success line with the session ID and the record path', async () => {
    const result = await sessionCreate(validArgs());

    expect(result.stdout).toContain('session created: worker-1');
    expect(result.stdout).toContain(recordFile());
  });

  it('keeps the token out of the request, the output and the record', async () => {
    const result = await sessionCreate(validArgs(['--json']));

    expect(result.exitCode).toBe(0);
    const requestText = JSON.stringify(result.createChatSession.mock.calls);
    expect(requestText).not.toContain(TOKEN);
    expect(result.stdout).not.toContain(TOKEN);
    expect(result.stderr).not.toContain(TOKEN);
    expect(readFileSync(recordFile(), 'utf8')).not.toContain(TOKEN);
  });

  it('shows the create help with the parameters, the metadata keys and the limits', async () => {
    const result = await sessionCreate(['--help']);
    const help = result.stdout;

    expect(help).toContain('--saga');
    expect(help).toContain('--master');
    expect(help).toContain('--item');
    expect(help).toContain('saga.worker');
    expect(help).toContain('^[a-z][a-z0-9._-]{0,63}$');
    expect(help).toContain('at most 16 entries');
  });
});

describe('saga session create: --hero', () => {
  const HERO_GUID = '3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6b';

  it('sends a Hero name as heroName, with the same metadata and the same record line as without --hero', async () => {
    const plain = await sessionCreate(validArgs());
    const plainRecord = readFileSync(recordFile(), 'utf8');
    rmSync(recordFile());

    const named = await sessionCreate(validArgs(['--hero', ' Nova ']));

    const plainBody = plain.createChatSession.mock.calls[0][0];
    expect(named.createChatSession).toHaveBeenCalledWith({ ...plainBody, heroName: 'Nova' });
    expect(named.createChatSession.mock.calls[0][0]).not.toHaveProperty('heroId');
    expect(readFileSync(recordFile(), 'utf8')).toBe(plainRecord);
  });

  it('sends a GUID given through --hero as heroId and no heroName', async () => {
    const result = await sessionCreate(validArgs(['--hero', HERO_GUID]));

    const body = result.createChatSession.mock.calls[0][0];
    expect(body.heroId).toBe(HERO_GUID);
    expect(body).not.toHaveProperty('heroName');
  });

  it('sends the same request as before when --hero is absent', async () => {
    const result = await sessionCreate(validArgs());

    expect(Object.keys(result.createChatSession.mock.calls[0][0]).sort()).toEqual(['metadata', 'projectId', 'title']);
  });

  it('refuses a blank --hero value with exit 2 before any file access or backend request', async () => {
    const result = await sessionCreate(validArgs(['--hero', '   ']));

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('--hero needs a nonblank Hero name or ID.');
    expectNoBackendCall(result);
    expect(result.createChatSession).not.toHaveBeenCalled();
    expect(existsSync(path.join(sagaDirectory(), 'runtime'))).toBe(false);
    expect(existsSync(recordFile())).toBe(false);
  });

  it('passes the backend rejection of an unknown Hero name through and writes no record line', async () => {
    const result = await sessionCreate(validArgs(['--hero', 'Nobody']), {
      createChatSession: vi.fn().mockRejectedValue(createApiError(400, { error: "Hero 'Nobody' was not found." })),
    });

    expect(result.exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(result.stderr).toContain("Hero 'Nobody' was not found.");
    expect(existsSync(recordFile())).toBe(false);
  });

  it('shows the bound Hero in the human result and in the JSON session when the backend returns one', async () => {
    const bound = vi.fn().mockResolvedValue({
      ...createSession('worker-1', PCode_Models_SessionType.CHAT),
      chatHero: { heroId: HERO_GUID, name: 'Nova' },
    });

    const human = await sessionCreate(validArgs(['--hero', 'Nova']), { createChatSession: bound });
    expect(human.stdout).toContain(`hero          Nova (${HERO_GUID})`);

    const json = await sessionCreate([...validArgs(['--hero', 'Nova']), '--json'], { createChatSession: bound });
    expect(JSON.parse(json.stdout).session.chatHero).toEqual({ heroId: HERO_GUID, name: 'Nova' });
  });

  it('shows no Hero line when the response carries no chat Hero', async () => {
    const result = await sessionCreate(validArgs());

    expect(result.stdout).not.toContain('hero ');
  });

  it('runs the --hero example from the Saga reference against the fake backend', async () => {
    const result = await sessionCreate([
      '--saga', 'demo', '--path', projectPath, '--title', 'T1 implementation', '--role', 'implementation',
      '--master', 'orchestrator-1', '--item', 'T1', '--hero', 'Nova', '--json',
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.createChatSession.mock.calls[0][0]).toMatchObject({ heroName: 'Nova' });
    expect(JSON.parse(result.stdout).ok).toBe(true);
  });

  it('lists --hero and its rule in the create help', async () => {
    const result = await sessionCreate(['--help']);

    expect(result.stdout).toContain('--hero <name-or-id>');
    expect(result.stdout).toContain('a GUID is sent as a Hero ID');
  });
});

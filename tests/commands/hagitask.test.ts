import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../src/generated/api/models/PCode_Models_MessageMode';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createHagiTaskSchema, createHagiTaskSummary, createMessage, createMessageList, fakeWaitClock, sessionWithStatus } from './testHelpers';

describe('hagitask commands', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hagi-hagitask-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeInput(name: string, content: string): string {
    const path = join(tempDir, name);
    writeFileSync(path, content, 'utf8');
    return path;
  }

  describe('create', () => {
    it('creates a session from a preset task with the parsed input and reports the session id', async () => {
      const { dependencies, api, stdout } = createDependencies();
      const inputPath = writeInput('input.json', JSON.stringify({ inputs: { commitScope: 'cli' } }));

      expect(await runCli(
        [
          'node', 'hagi', 'hagitask', 'create',
          '--title', 'Auto',
          '--project-id', 'project-1',
          '--task-id', 'compose-commit',
          '--input', inputPath,
          '--locale', 'en-US',
          '--repository-path', 'repos/cli',
          '--need-push',
          '--pull-rebase',
          '--target-branch-mode', 'new-custom',
          '--target-branch-name', 'feature/cli',
          '--script-key', 'hagitask.auto-compose-commit',
          '--hero-id', 'hero-1',
          '--hero-selection-mode', 'random',
          '--json',
        ],
        dependencies,
      )).toBe(0);

      expect(api.createHagiTaskSession).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Auto',
        projectId: 'project-1',
        presetTaskId: 'compose-commit',
        presetTaskLocale: 'en-US',
        presetTaskInput: { inputs: { commitScope: 'cli' } },
        repositoryPath: 'repos/cli',
        needPush: true,
        pullRebaseBeforePush: true,
        targetBranchMode: 'new-custom',
        targetBranchName: 'feature/cli',
        scriptKey: 'hagitask.auto-compose-commit',
        heroId: 'hero-1',
        heroSelectionMode: 'random',
      }));

      const output = JSON.parse(stdout.join(''));
      expect(output.session.sessionId).toBe('hagitask-1');
      expect(output.presetTaskId).toBe('compose-commit');
      expect(output.promptId).toBeNull();
      expect(output.requested.presetTaskId).toBe('compose-commit');
    });

    it('creates a session from a prompt id without a preset task id', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'Chat', '--project-id', 'project-1', '--prompt-id', 'auto-compose-commit.en-US', '--json'],
        dependencies,
      )).toBe(0);

      const request = api.createHagiTaskSession.mock.calls[0][0];
      expect(request.promptId).toBe('auto-compose-commit.en-US');
      expect(request.presetTaskId).toBeUndefined();
      expect(request.presetTaskInput).toBeUndefined();
    });

    it('forwards the vault, target and branch routing fields', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(
        [
          'node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--prompt-id', 'research.en-US',
          '--target-type', 'vault', '--vault-id', 'vault-1', '--output-vault-id', 'vault-2',
          '--reference-vault-id', 'vault-3', 'vault-4', '--editable-vault-id', 'vault-5',
          '--message', 'hello', '--hero-id', 'hero-9', '--json',
        ],
        dependencies,
      )).toBe(0);

      expect(api.createHagiTaskSession).toHaveBeenCalledWith(expect.objectContaining({
        targetType: 'vault',
        vaultId: 'vault-1',
        outputVaultId: 'vault-2',
        referenceVaultIds: ['vault-3', 'vault-4'],
        editableVaultIds: ['vault-5'],
        message: 'hello',
        heroId: 'hero-9',
      }));
    });

    it('requires a task id or a prompt id before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const exitCode = await runCli(['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1'], dependencies);

      expect(exitCode).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--task-id or --prompt-id');
    });

    it('rejects --input without --task-id before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const inputPath = writeInput('input.json', '{}');
      const exitCode = await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--prompt-id', 'x.en-US', '--input', inputPath],
        dependencies,
      );

      expect(exitCode).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--input requires --task-id');
    });

    it('rejects input that is not a JSON object, naming the source, before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const arrayPath = writeInput('array.json', '[1, 2]');
      const brokenPath = writeInput('broken.json', '{ not json');

      expect(await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--task-id', 'compose-commit', '--input', arrayPath],
        dependencies,
      )).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain(`HagiTask input from ${arrayPath} must be a JSON object.`);

      expect(await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--task-id', 'compose-commit', '--input', brokenPath],
        dependencies,
      )).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
    });

    it('rejects a hero selection mode other than first or random before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const exitCode = await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--prompt-id', 'x.en-US', '--hero-selection-mode', 'round-robin'],
        dependencies,
      );

      expect(exitCode).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--hero-selection-mode must be first or random');
    });

    it('validates branch options before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const exitCode = await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'Auto', '--project-id', 'project-1', '--prompt-id', 'auto-compose-commit.en-US', '--target-branch-name', 'feature/cli', '--json'],
        dependencies,
      );

      expect(exitCode).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('target-branch-mode new-custom');
    });

    it('prints the backend rejection unchanged and does not report a created session', async () => {
      const { dependencies, stdout, stderr } = createDependencies({
        createHagiTaskSession: async () => {
          throw createApiError(400, { error: 'Preset task input contains undefined key "foo".' });
        },
      });
      const inputPath = writeInput('input.json', JSON.stringify({ inputs: { foo: 'bar' } }));
      const exitCode = await runCli(
        ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--task-id', 'compose-commit', '--input', inputPath],
        dependencies,
      );

      expect(exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
      expect(stderr.join('')).toContain('Preset task input contains undefined key "foo".');
      expect(stdout.join('')).not.toContain('HagiTask session created');
    });

    const HERO_GUID = '3f2a9c1e-8b7d-4e5f-9a1b-0c2d3e4f5a6b';
    const baseCreateArgs = ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', '--prompt-id', 'research.en-US'];

    it('sends a Hero name as heroName and echoes it in requested', async () => {
      const { dependencies, api, stdout } = createDependencies();

      expect(await runCli([...baseCreateArgs, '--hero', ' Nova ', '--json'], dependencies)).toBe(0);

      const request = api.createHagiTaskSession.mock.calls[0][0];
      expect(request.heroName).toBe('Nova');
      expect(request.heroId).toBeUndefined();
      const output = JSON.parse(stdout.join(''));
      expect(output.requested.heroName).toBe('Nova');
      expect(output.requested).not.toHaveProperty('heroId');
    });

    it('sends a GUID given through --hero as heroId', async () => {
      const { dependencies, api, stdout } = createDependencies();

      expect(await runCli([...baseCreateArgs, '--hero', HERO_GUID, '--json'], dependencies)).toBe(0);

      const request = api.createHagiTaskSession.mock.calls[0][0];
      expect(request.heroId).toBe(HERO_GUID);
      expect(request.heroName).toBeUndefined();
      const output = JSON.parse(stdout.join(''));
      expect(output.requested.heroId).toBe(HERO_GUID);
      expect(output.requested).not.toHaveProperty('heroName');
    });

    it('shows the Hero reference in the human summary', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli([...baseCreateArgs, '--hero', 'Nova'], dependencies)).toBe(0);

      expect(stdout.join('')).toContain('heroName');
      expect(stdout.join('')).toContain('Nova');
    });

    it('rejects --hero together with --hero-id as a usage error before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const exitCode = await runCli([...baseCreateArgs, '--hero', 'Nova', '--hero-id', HERO_GUID], dependencies);

      expect(exitCode).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--hero and --hero-id cannot be given together');
    });

    it('rejects a blank --hero value as a usage error before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const exitCode = await runCli([...baseCreateArgs, '--hero', '   '], dependencies);

      expect(exitCode).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--hero needs a nonblank Hero name or ID.');
    });

    it('sends neither Hero field when --hero and --hero-id are both absent', async () => {
      const { dependencies, api, stdout } = createDependencies();

      expect(await runCli([...baseCreateArgs, '--json'], dependencies)).toBe(0);

      const request = api.createHagiTaskSession.mock.calls[0][0];
      expect(request.heroId).toBeUndefined();
      expect(request.heroName).toBeUndefined();
      expect(JSON.parse(stdout.join('')).requested).not.toHaveProperty('heroName');
    });

    it('prints the backend rejection of an unknown Hero name and reports no created session', async () => {
      const { dependencies, stdout, stderr } = createDependencies({
        createHagiTaskSession: async () => {
          throw createApiError(400, { error: "Hero 'Nobody' was not found." });
        },
      });
      const exitCode = await runCli([...baseCreateArgs, '--hero', 'Nobody'], dependencies);

      expect(exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
      expect(stderr.join('')).toContain("Hero 'Nobody' was not found.");
      expect(stdout.join('')).not.toContain('HagiTask session created');
    });
  });

  describe('list', () => {
    it('prints one row per active task', async () => {
      const { dependencies, api, stdout } = createDependencies({
        listHagiTaskSchemas: vi.fn(async () => [
          createHagiTaskSummary('zeta-task', { title: 'Zeta', description: null }),
          createHagiTaskSummary('alpha-task', { title: 'Alpha' }),
        ]),
      });

      expect(await runCli(['node', 'hagi', 'hagitask', 'list'], dependencies)).toBe(0);
      expect(api.listHagiTaskSchemas).toHaveBeenCalledTimes(1);

      const output = stdout.join('');
      expect(output).toContain('HagiTasks (2)');
      expect(output.indexOf('alpha-task')).toBeLessThan(output.indexOf('zeta-task'));
      expect(output).toContain('Alpha');
      expect(output).toContain('1.0.0');
    });

    it('prints the same deterministic JSON on every run', async () => {
      const { dependencies, stdout } = createDependencies({
        listHagiTaskSchemas: async () => [createHagiTaskSummary('beta'), createHagiTaskSummary('alpha')],
      });

      expect(await runCli(['node', 'hagi', 'hagitask', 'list', '--json'], dependencies)).toBe(0);
      const first = stdout.splice(0).join('');
      expect(await runCli(['node', 'hagi', 'hagitask', 'list', '--json'], dependencies)).toBe(0);
      const second = stdout.splice(0).join('');

      expect(first).toBe(second);
      expect(JSON.parse(first).tasks.map((task: { id: string }) => task.id)).toEqual(['alpha', 'beta']);
    });

    it('reports an empty list and exits successfully', async () => {
      const { dependencies, stdout } = createDependencies({ listHagiTaskSchemas: async () => [] });

      expect(await runCli(['node', 'hagi', 'hagitask', 'list'], dependencies)).toBe(0);
      expect(stdout.join('')).toBe('No HagiTask is available.\n');
    });
  });

  describe('schema', () => {
    it('shows scope, commands, parameters with required marks, endpoint and an example', async () => {
      const { dependencies, api, stdout } = createDependencies();

      expect(await runCli(['node', 'hagi', 'hagitask', 'schema', '--task-id', 'compose-commit'], dependencies)).toBe(0);
      expect(api.getHagiTaskSchema).toHaveBeenCalledWith('compose-commit');

      const output = stdout.join('');
      expect(output).toContain('Target scope (default repository)');
      expect(output).toContain('targets.repositories');
      expect(output).toMatch(/commitScope\s+yes\s+input\s+string/);
      expect(output).toMatch(/language\s+no\s+input/);
      expect(output).toContain('alias lang (deprecated)');
      expect(output).toContain('options: en');
      expect(output).toContain('- agent: claude');
      expect(output).toContain('- default: Default');
      expect(output).toContain('POST /api/Sessions/hagitask');
      expect(output).toContain('hagi hagitask create --title "<title>" --project-id <project-id> --task-id compose-commit --input input.json');
    });

    it('prints the full schema with stable key order as JSON', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli(['node', 'hagi', 'hagitask', 'schema', '--task-id', 'compose-commit', '--json'], dependencies)).toBe(0);
      const output = stdout.join('');
      const parsed = JSON.parse(output);
      expect(parsed.inputSchema.required).toEqual(['commitScope']);
      expect(parsed.example.presetTaskId).toBe('compose-commit');
      expect(Object.keys(parsed)).toEqual([...Object.keys(parsed)].sort());
    });

    it('requires --task-id before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(['node', 'hagi', 'hagitask', 'schema'], dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.getHagiTaskSchema).not.toHaveBeenCalled();
      expect(stderr.join('')).toContain('--task-id');
    });

    it('prints the diagnostics of a disabled task with the not-found error', async () => {
      const { dependencies, stderr } = createDependencies({
        getHagiTaskSchema: async () => {
          throw createApiError(404, {
            error: 'HagiTask "legacy-task" is not available.',
            diagnostics: [{ code: 'PRESET_TASK_DISABLED', message: 'Disabled by its package.', path: 'packages/legacy' }],
          });
        },
      });

      expect(await runCli(['node', 'hagi', 'hagitask', 'schema', '--task-id', 'legacy-task'], dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
      const errorOutput = stderr.join('');
      expect(errorOutput).toContain('HagiTask "legacy-task" is not available.');
      expect(errorOutput).toContain('PRESET_TASK_DISABLED: Disabled by its package. (packages/legacy)');
    });
  });

  describe('send', () => {
    it('sends a follow-up message to the HagiTask session', async () => {
      const { dependencies, api, stdout } = createDependencies();

      expect(await runCli(
        ['node', 'hagi', 'hagitask', 'send', '--session-id', 'hagitask-1', '--content', 'continue', '--mode', 'Edit', '--executor-type', 'CodexCli', '--json'],
        dependencies,
      )).toBe(0);
      expect(api.sendMessage).toHaveBeenCalledWith('hagitask-1', {
        content: 'continue',
        mode: PCode_Models_MessageMode.EDIT,
        executorType: PCode_Models_AIProviderType.CODEX_CLI,
      });
      expect(stdout.join('')).toContain('"sessionId": "hagitask-1"');
    });

    it('prints a human confirmation that names the HagiTask session', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli(['node', 'hagi', 'hagitask', 'send', '--session-id', 'hagitask-1', '--content', 'continue'], dependencies)).toBe(0);
      expect(stdout.join('')).toContain('HagiTask message sent');
    });
  });
});

describe('hagitask get', () => {
  it('reads a HagiTask session by id, including a Super Commit session, as JSON', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getSession: vi.fn().mockResolvedValue(sessionWithStatus('hagitask-1', 'ExecutionCompleted', PCode_Models_SessionType.CHAT)),
    });

    expect(await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 'hagitask-1', '--json'], dependencies)).toBe(0);
    expect(api.getSession).toHaveBeenCalledWith('hagitask-1');
    expect(JSON.parse(stdout.join(''))).toEqual({
      session: expect.objectContaining({ sessionId: 'hagitask-1', status: 'ExecutionCompleted', type: 'Chat' }),
    });
  });

  it('waits for a Super Commit run to leave Executing and reports the settled status', async () => {
    const { dependencies, api, stdout } = createDependencies();
    Object.assign(dependencies, fakeWaitClock());
    vi.mocked(api.getSession)
      .mockResolvedValueOnce(sessionWithStatus('hagitask-1', 'Executing', PCode_Models_SessionType.CHAT) as never)
      .mockResolvedValueOnce(sessionWithStatus('hagitask-1', 'ExecutionCompleted', PCode_Models_SessionType.CHAT) as never);

    expect(await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 'hagitask-1', '--wait', '--json'], dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(body.session.status).toBe('ExecutionCompleted');
    expect(body.wait).toMatchObject({ settled: true, timedOut: false, transitionSeen: true, polls: 2 });
  });

  it('exits 31 when the Super Commit run is still Executing at the timeout', async () => {
    const { dependencies, api, stdout } = createDependencies();
    Object.assign(dependencies, fakeWaitClock());
    vi.mocked(api.getSession).mockResolvedValue(sessionWithStatus('hagitask-1', 'Executing', PCode_Models_SessionType.CHAT) as never);

    expect(await runCli(
      ['node', 'hagi', 'hagitask', 'get', '--session-id', 'hagitask-1', '--wait', '--timeout', '10', '--interval', '5'],
      dependencies,
    )).toBe(EXIT_CODES.WAIT_TIMEOUT);
    expect(stdout.join('')).toContain('status is still Executing');
  });

  it('reports WaitingForReply as settled for a HagiTask session', async () => {
    const { dependencies, api, stdout } = createDependencies();
    Object.assign(dependencies, fakeWaitClock());
    vi.mocked(api.getSession).mockResolvedValue(sessionWithStatus('hagitask-1', 'WaitingForReply', PCode_Models_SessionType.CHAT) as never);

    expect(await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 'hagitask-1', '--wait', '--grace', '0'], dependencies)).toBe(0);
    expect(stdout.join('')).toContain('a person must answer');
  });

  it.each([
    [['--timeout', '60'], '--timeout needs --wait'],
    [['--interval', '5'], '--interval needs --wait'],
    [['--wait', '--interval', '60', '--timeout', '60'], '--interval must be less than --timeout'],
    [['--wait', '--timeout', '0'], '--timeout must be 1 second or more'],
    [['--wait', '--grace', 'x'], '--grace must be a whole number of seconds'],
  ])('rejects %j before any request', async (extra, message) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 'hagitask-1', ...extra], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(message);
    expect(api.getSession).not.toHaveBeenCalled();
  });

  it('requires --session-id and rejects a wait-only option without --wait, before any request', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(['node', 'hagi', 'hagitask', 'get', '--wait'], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(await runCli(['node', 'hagi', 'hagitask', 'get', '--session-id', 'hagitask-1', '--grace', '5'], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--grace needs --wait');
    expect(api.getSession).not.toHaveBeenCalled();
  });
});

describe('hagitask messages', () => {
  it('reads the newest message of a Super Commit session with --last 1', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(createMessageList({
        messages: [createMessage('m1', [{ type: 'Text', text: '## Commits Created\n**Commits:** 1' }])],
      })),
    });

    expect(await runCli(['node', 'hagi', 'hagitask', 'messages', '--session-id', 'hagitask-1', '--last', '1'], dependencies)).toBe(0);
    expect(api.getSessionMessages).toHaveBeenCalledWith('hagitask-1', { page: 1, pageSize: 1, order: 'desc' });
    expect(stdout.join('')).toContain('## Commits Created');
  });

  it('reports an empty session and rejects --last 0 before any request', async () => {
    const { dependencies, api, stdout, stderr } = createDependencies({
      getSessionMessages: vi.fn().mockResolvedValue(createMessageList({ messages: [], totalCount: 0 })),
    });

    expect(await runCli(['node', 'hagi', 'hagitask', 'messages', '--session-id', 'hagitask-1', '--last', '1'], dependencies)).toBe(0);
    expect(stdout.join('')).toContain('No messages found.');

    expect(await runCli(['node', 'hagi', 'hagitask', 'messages', '--session-id', 'hagitask-1', '--last', '0'], dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--last must be a positive whole number');
    expect(api.getSessionMessages).toHaveBeenCalledTimes(1);
  });

  it('lists get and messages in the hagitask help', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'hagitask', '--help'], dependencies)).toBe(0);
    const help = stdout.join('');
    expect(help).toMatch(/^\s+get\b/m);
    expect(help).toMatch(/^\s+messages\b/m);
  });
});

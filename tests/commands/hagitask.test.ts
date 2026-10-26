import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_MessageMode } from '../../src/generated/api/models/PCode_Models_MessageMode';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createHagiTaskSchema, createHagiTaskSummary } from './testHelpers';

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

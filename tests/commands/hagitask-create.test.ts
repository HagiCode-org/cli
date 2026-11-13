import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { Command } from 'commander';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadHagiTaskInput, registerHagiTaskCreateCommand } from '../../src/commands/hagitask/create';
import { runCli } from '../../src/main';
import { CliUsageError, EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from './testHelpers';

const create = (...args: string[]) => ['node', 'hagi', 'hagitask', 'create', '--title', 'T', '--project-id', 'p-1', ...args];

describe('hagi hagitask create (src/commands/hagitask/create.ts)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'hagi-hagitask-create-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function writeInput(name: string, content: string): string {
    const path = join(tempDir, name);
    writeFileSync(path, content, 'utf8');
    return path;
  }

  describe('loadHagiTaskInput', () => {
    it('reads a JSON object from a file', async () => {
      const path = writeInput('input.json', JSON.stringify({ inputs: { scope: 'cli' }, flag: true }));

      await expect(loadHagiTaskInput(path)).resolves.toEqual({ inputs: { scope: 'cli' }, flag: true });
    });

    it('accepts an empty object', async () => {
      await expect(loadHagiTaskInput(writeInput('empty.json', '{}'))).resolves.toEqual({});
    });

    it('reads the object from standard input with -', async () => {
      vi.spyOn(process, 'stdin', 'get').mockReturnValue(Readable.from(['{"inputs":', '{"a":1}}']) as never);

      await expect(loadHagiTaskInput('-')).resolves.toEqual({ inputs: { a: 1 } });
    });

    it.each([
      ['an array', '[1, 2]'],
      ['null', 'null'],
      ['a string', '"text"'],
      ['a number', '42'],
    ])('rejects %s, naming the source', async (_label, content) => {
      const path = writeInput('wrong.json', content);
      const error = await loadHagiTaskInput(path).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as Error).message).toBe(`HagiTask input from ${path} must be a JSON object.`);
    });

    it('turns a missing file into a usage error that names the source', async () => {
      const path = join(tempDir, 'missing.json');
      const error = await loadHagiTaskInput(path).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as Error).message).toContain(`Cannot read HagiTask input from ${path}:`);
    });

    it('passes the usage error of malformed JSON through unchanged', async () => {
      const path = writeInput('broken.json', '{"inputs": ');
      const error = await loadHagiTaskInput(path).catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as Error).message).toContain(`Invalid JSON input from ${path}:`);
      expect((error as Error).message).not.toContain('Cannot read HagiTask input');
    });

    it('passes the usage error of a blank source through unchanged', async () => {
      const error = await loadHagiTaskInput('   ').catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(CliUsageError);
      expect((error as Error).message).toBe('Provide --input <file> or --input - for stdin.');
    });
  });

  describe('registration', () => {
    function register() {
      const { dependencies } = createDependencies();
      const parent = new Command('hagitask');
      registerHagiTaskCreateCommand(parent, dependencies);
      const command = parent.commands.find(candidate => candidate.name() === 'create');
      return { parent, command };
    }

    it('adds a single create subcommand that points to the schema command', () => {
      const { parent, command } = register();

      expect(parent.commands.map(candidate => candidate.name())).toEqual(['create']);
      expect(command?.description()).toContain('hagitask schema --task-id <id>');
      expect(command?.description()).toContain('--input');
    });

    it('requires only --title and --project-id', () => {
      const { command } = register();
      const mandatory = command?.options.filter(option => option.mandatory).map(option => option.long);

      expect(mandatory).toEqual(['--title', '--project-id']);
    });

    it('offers every routing, hero and branch option', () => {
      const { command } = register();
      const flags = command?.options.map(option => option.long) ?? [];

      expect(flags).toEqual(expect.arrayContaining([
        '--task-id', '--prompt-id', '--input', '--message', '--locale', '--repository-path', '--target-type',
        '--vault-id', '--output-vault-id', '--reference-vault-id', '--editable-vault-id', '--hero-id', '--hero',
        '--hero-selection-mode', '--need-push', '--pull-rebase', '--target-branch-mode', '--target-branch-name',
        '--script-key', '--json',
      ]));
    });
  });

  describe('request', () => {
    it('leaves every optional field unset when only a prompt id is given', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create('--prompt-id', 'research.en-US'), dependencies)).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenCalledExactlyOnceWith({
        title: 'T',
        projectId: 'p-1',
        promptId: 'research.en-US',
        presetTaskId: undefined,
        presetTaskLocale: undefined,
        presetTaskInput: undefined,
        message: undefined,
        repositoryPath: undefined,
        targetType: undefined,
        vaultId: undefined,
        outputVaultId: undefined,
        referenceVaultIds: undefined,
        editableVaultIds: undefined,
        heroId: undefined,
        heroName: undefined,
        heroSelectionMode: undefined,
        needPush: undefined,
        pullRebaseBeforePush: undefined,
        targetBranchMode: undefined,
        targetBranchName: undefined,
        scriptKey: undefined,
      });
    });

    it('trims text options and drops blank ones', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(
        create('--prompt-id', ' research.en-US ', '--locale', ' en-US ', '--message', '   ', '--repository-path', ' repos/cli ', '--script-key', ''),
        dependencies,
      )).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenCalledWith(expect.objectContaining({
        promptId: 'research.en-US',
        presetTaskLocale: 'en-US',
        message: undefined,
        repositoryPath: 'repos/cli',
        scriptKey: undefined,
      }));
    });

    it('sends the push flags only when they are given', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create('--prompt-id', 'x.en-US', '--need-push'), dependencies)).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenLastCalledWith(
        expect.objectContaining({ needPush: true, pullRebaseBeforePush: undefined }),
      );

      expect(await runCli(create('--prompt-id', 'x.en-US', '--need-push', '--pull-rebase'), dependencies)).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenLastCalledWith(
        expect.objectContaining({ needPush: true, pullRebaseBeforePush: true }),
      );
    });

    it('drops blank vault ids from the vault id lists', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(
        create('--prompt-id', 'x.en-US', '--reference-vault-id', ' v-1 ', ' ', '--editable-vault-id', ' '),
        dependencies,
      )).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenCalledWith(expect.objectContaining({
        referenceVaultIds: ['v-1'],
        editableVaultIds: undefined,
      }));
    });

    it('sends the target branch name with the new-custom mode', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(
        create('--prompt-id', 'x.en-US', '--target-branch-mode', 'new-custom', '--target-branch-name', ' feature/tests '),
        dependencies,
      )).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenCalledWith(
        expect.objectContaining({ targetBranchMode: 'new-custom', targetBranchName: 'feature/tests' }),
      );
    });

    it.each(['first', 'random'])('accepts the hero selection mode %s', async mode => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(create('--prompt-id', 'x.en-US', '--hero-selection-mode', mode), dependencies)).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenCalledWith(expect.objectContaining({ heroSelectionMode: mode }));
    });

    it('reads the structured input from standard input with --input -', async () => {
      vi.spyOn(process, 'stdin', 'get').mockReturnValue(Readable.from(['{"inputs":{"scope":"web"}}']) as never);
      const { dependencies, api } = createDependencies();

      expect(await runCli(create('--task-id', 'compose-commit', '--input', '-'), dependencies)).toBe(0);
      expect(api.createHagiTaskSession).toHaveBeenCalledWith(expect.objectContaining({
        presetTaskId: 'compose-commit',
        presetTaskInput: { inputs: { scope: 'web' } },
      }));
    });
  });

  describe('usage errors', () => {
    it('treats blank --task-id and --prompt-id as missing', async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(create('--task-id', '  ', '--prompt-id', ' '), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain('Provide --task-id or --prompt-id.');
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
    });

    it('rejects a blank --input value before any request', async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(create('--task-id', 'compose-commit', '--input', '  '), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain('--input is required.');
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
    });

    it('rejects a missing input file as a usage error that names the file', async () => {
      const { dependencies, api, stderr } = createDependencies();
      const path = join(tempDir, 'nope.json');

      expect(await runCli(create('--task-id', 'compose-commit', '--input', path), dependencies)).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain(`Cannot read HagiTask input from ${path}`);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
    });

    it('requires a nonblank branch name for the new-custom mode', async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(
        create('--prompt-id', 'x.en-US', '--target-branch-mode', 'new-custom', '--target-branch-name', '   '),
        dependencies,
      )).toBe(EXIT_CODES.USAGE);
      expect(stderr.join('')).toContain('--target-branch-name is required when --target-branch-mode is new-custom.');
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
    });

    it('requires --title and --project-id', async () => {
      const { dependencies, api } = createDependencies();

      expect(await runCli(['node', 'hagi', 'hagitask', 'create', '--prompt-id', 'x.en-US'], dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.createHagiTaskSession).not.toHaveBeenCalled();
    });
  });

  describe('output', () => {
    it('reports a null preset task id when the session came from a prompt id', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli(create('--prompt-id', 'research.en-US', '--json'), dependencies)).toBe(0);
      const parsed = JSON.parse(stdout.join(''));
      expect(parsed.presetTaskId).toBeNull();
      expect(parsed.promptId).toBe('research.en-US');
      expect(parsed.session.sessionId).toBe('hagitask-1');
    });

    it('reports a null prompt id when the session came from a preset task', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli(create('--task-id', 'compose-commit', '--json'), dependencies)).toBe(0);
      const parsed = JSON.parse(stdout.join(''));
      expect(parsed.presetTaskId).toBe('compose-commit');
      expect(parsed.promptId).toBeNull();
    });

    it('prints a confirmation with only the request fields that were set', async () => {
      const { dependencies, stdout } = createDependencies();

      expect(await runCli(
        create('--task-id', 'compose-commit', '--locale', 'en-US', '--repository-path', 'repos/cli', '--script-key', 'hagitask.compose'),
        dependencies,
      )).toBe(0);
      const output = stdout.join('');
      expect(output.startsWith('HagiTask session created\n')).toBe(true);
      expect(output).toContain('hagitask-1');
      expect(output).toMatch(/presetTaskId\s+compose-commit/);
      expect(output).toMatch(/presetTaskLocale\s+en-US/);
      expect(output).toMatch(/repositoryPath\s+repos\/cli/);
      expect(output).toMatch(/scriptKey\s+hagitask\.compose/);
      expect(output).not.toContain('promptId');
      expect(output).not.toContain('targetBranchMode');
      expect(output).not.toContain('heroSelectionMode');
    });
  });
});

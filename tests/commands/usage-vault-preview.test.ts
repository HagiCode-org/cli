import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerUsageCommands } from '../../src/commands/usage';
import { registerVaultCommands } from '../../src/commands/vault';
import { registerVaultFilesPreviewCommand } from '../../src/commands/vault/files/preview';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createTokenMonitorSnapshot } from './testHelpers';

const usage = (...args: string[]) => ['node', 'hagi', 'usage', 'limits', ...args];
const preview = (...args: string[]) => ['node', 'hagi', 'vault', 'files', 'preview', ...args];

describe('registerUsageCommands (src/commands/usage.ts)', () => {
  it('adds a usage group with a limits subcommand and its options', () => {
    const { dependencies } = createDependencies();
    const program = new Command('hagi');

    registerUsageCommands(program, dependencies);

    const group = program.commands.find(command => command.name() === 'usage');
    const limits = group?.commands.find(command => command.name() === 'limits');
    expect(group?.commands.map(command => command.name())).toEqual(['limits']);
    expect(limits?.options.map(option => option.long)).toEqual(
      expect.arrayContaining(['--provider', '--wait-until-above', '--max-wait', '--jitter-seconds', '--json']),
    );
  });

  it('lists the exit codes in the limits help', () => {
    const { dependencies } = createDependencies();
    const program = new Command('hagi');
    registerUsageCommands(program, dependencies);
    const limits = program.commands[0].commands[0];
    let help = '';
    limits.configureOutput({ writeOut: text => { help += text; } });

    limits.outputHelp();

    expect(help).toContain(`Exit codes: 0 a usable reading`);
    expect(help).toContain(`${EXIT_CODES.QUOTA_UNKNOWN} unavailable`);
  });
});

describe('hagi usage limits: option parsing', () => {
  const wait = (...args: string[]) => usage('--wait-until-above', ...args);

  it.each([
    ['101', '--wait-until-above must be between 0 and 100.'],
    ['1000', '--wait-until-above must be between 0 and 100.'],
    ['-1', '--wait-until-above must be a whole number.'],
    ['1.5', '--wait-until-above must be a whole number.'],
    ['abc', '--wait-until-above must be a whole number.'],
    ['', '--wait-until-above must be a whole number.'],
  ])('rejects --wait-until-above %j before any backend call', async (value, message) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(wait(value, '--provider', 'claude'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(message);
    expect(api.getTokenMonitorUsage).not.toHaveBeenCalled();
  });

  it.each(['0', '100'])('accepts the boundary threshold %s', async value => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(wait(value, '--provider', 'claude', '--max-wait', '0', '--json'), dependencies)).toBe(0);
    expect(api.getTokenMonitorUsage).toHaveBeenCalled();
  });

  it('names the allowed range for --max-wait and --jitter-seconds', async () => {
    const maxWait = createDependencies();
    const jitter = createDependencies();

    await runCli(wait('10', '--provider', 'claude', '--max-wait', '21601'), maxWait.dependencies);
    await runCli(wait('10', '--provider', 'claude', '--jitter-seconds', '3601'), jitter.dependencies);

    expect(maxWait.stderr.join('')).toContain('--max-wait must be between 0 and 21600.');
    expect(jitter.stderr.join('')).toContain('--jitter-seconds must be between 0 and 3600.');
  });

  it.each(['-1', '2.5', 'x'])('rejects --jitter-seconds %s as not a whole number', async value => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(wait('10', '--provider', 'claude', '--jitter-seconds', value), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--jitter-seconds must be a whole number.');
    expect(api.getTokenMonitorUsage).not.toHaveBeenCalled();
  });

  it('counts a blank provider as none, so a wait without a real provider is refused', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(wait('10', '--provider', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--wait-until-above needs --provider <id>');
    expect(api.getTokenMonitorUsage).not.toHaveBeenCalled();
  });

  it('refuses --max-wait and --jitter-seconds together without a wait, in one message', async () => {
    const { dependencies, stderr } = createDependencies();

    expect(await runCli(usage('--max-wait', '5', '--jitter-seconds', '5'), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--max-wait and --jitter-seconds apply only with --wait-until-above <percent>.');
  });

  it('trims the provider and filters the reading to it', async () => {
    const { dependencies, stdout } = createDependencies({
      getTokenMonitorUsage: vi.fn().mockResolvedValue(createTokenMonitorSnapshot()),
    });

    expect(await runCli(usage('--provider', '  claude  ', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(JSON.stringify(body)).toContain('claude');
    expect(JSON.stringify(body)).not.toContain('"provider":"codex"');
  });

  it('reads the snapshot once for a plain read', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(usage('--json'), dependencies)).toBe(0);
    expect(api.getTokenMonitorUsage).toHaveBeenCalledTimes(1);
  });

  it('maps an error from the backend to its exit code and prints no reading', async () => {
    const { dependencies, stdout } = createDependencies({
      getTokenMonitorUsage: vi.fn().mockRejectedValue(createApiError(403, { error: 'No access.' })),
    });

    expect(await runCli(usage('--json'), dependencies)).toBe(EXIT_CODES.HTTP_FORBIDDEN);
    expect(stdout.join('')).toBe('');
  });
});

describe('registerVaultCommands (src/commands/vault.ts)', () => {
  function register() {
    const made = createDependencies();
    const program = new Command('hagi');
    registerVaultCommands(program, made.dependencies);
    return { ...made, program, vault: program.commands.find(command => command.name() === 'vault') };
  }

  it('adds a single vault group with its four commands and a files group', () => {
    const { program, vault } = register();

    expect(program.commands.map(command => command.name())).toEqual(['vault']);
    expect(vault?.commands.map(command => command.name())).toEqual(['list', 'create', 'update', 'delete', 'files']);
  });

  it('puts list and preview under the files group', () => {
    const { vault } = register();
    const files = vault?.commands.find(command => command.name() === 'files');

    expect(files?.description()).toBe('Browse registered vault files and preview supported content.');
    expect(files?.commands.map(command => command.name())).toEqual(['list', 'preview']);
  });

  it('describes the group and gives every command a description', () => {
    const { vault } = register();

    expect(vault?.description()).toBe('Manage Hagi vaults and vault file browsing through generated backend APIs.');
    for (const command of vault?.commands ?? []) {
      expect(command.description(), command.name()).not.toBe('');
    }
  });

  it('makes no backend call while registering', () => {
    const { api } = register();

    for (const method of ['listVaults', 'createVault', 'updateVault', 'deleteVault', 'listVaultFiles', 'previewVaultFile'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });
});

describe('hagi vault files preview (registerVaultFilesPreviewCommand)', () => {
  it('exports the registration function the files group calls', () => {
    expect(typeof registerVaultFilesPreviewCommand).toBe('function');
  });

  it('previews the trimmed vault id and path', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(preview('--id', '  vault-1 ', '--path', ' docs/readme.md '), dependencies)).toBe(0);
    expect(api.previewVaultFile).toHaveBeenCalledExactlyOnceWith('vault-1', 'docs/readme.md');
  });

  it('prints the preview as a payload with defaults for missing fields in JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      previewVaultFile: vi.fn().mockResolvedValue({ vaultId: 'v', relativePath: 'a.md', previewSupported: true, content: '# Title' }),
    });

    expect(await runCli(preview('--id', 'v', '--path', 'a.md', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      vaultId: 'v',
      vaultName: '',
      relativePath: 'a.md',
      sizeBytes: 0,
      previewSupported: true,
      contentTruncated: false,
      content: '# Title',
    });
  });

  it('shows the content in human mode', async () => {
    const { dependencies, stdout } = createDependencies({
      previewVaultFile: vi.fn().mockResolvedValue({ vaultId: 'v', relativePath: 'a.md', previewSupported: true, content: 'Hello vault' }),
    });

    expect(await runCli(preview('--id', 'v', '--path', 'a.md'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('Hello vault');
  });

  it.each([
    ['--id', ['--id', '  ', '--path', 'a.md']],
    ['--path', ['--id', 'v', '--path', '  ']],
  ])('rejects a whitespace-only %s before any network call', async (flag, args) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(preview(...args), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain(`${flag} is required.`);
    expect(api.previewVaultFile).not.toHaveBeenCalled();
  });

  it.each([
    ['--id', ['--path', 'a.md']],
    ['--path', ['--id', 'v']],
  ])('fails without %s', async (_missing, rest) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(preview(...rest), dependencies)).not.toBe(0);
    expect(api.previewVaultFile).not.toHaveBeenCalled();
  });

  it('maps a missing vault or file to the not-found exit code and prints no preview', async () => {
    const { dependencies, stdout } = createDependencies({
      previewVaultFile: vi.fn().mockRejectedValue(createApiError(404, { error: 'No such file.' })),
    });

    expect(await runCli(preview('--id', 'v', '--path', 'gone.md'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
  });
});

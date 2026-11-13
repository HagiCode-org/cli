import { Command } from 'commander';
import { describe, expect, it, vi } from 'vitest';
import { registerProjectMonoSpecsValidateCommand } from '../../src/commands/project/monospecs/validate';
import { registerProjectRepositoriesCommand } from '../../src/commands/project/repositories';
import { registerProposalCommands } from '../../src/commands/proposal';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies, createProject, createProjectWithRepositories } from './testHelpers';

describe('hagi project monospecs validate (registerProjectMonoSpecsValidateCommand)', () => {
  const validate = (...args: string[]) => ['node', 'hagi', 'project', 'monospecs', 'validate', ...args];

  it('exports the registration function the monospecs group calls', () => {
    expect(typeof registerProjectMonoSpecsValidateCommand).toBe('function');
  });

  it('sends the project path from the snapshot and exits 0 for a valid configuration', async () => {
    const { dependencies, api, stdout } = createDependencies({
      listProjects: vi.fn().mockResolvedValue({ projects: [{ ...createProject('project-1'), path: '/srv/project-1' }] }),
      validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: true, config: { version: '1.0', repoDirectory: 'repos' }, warnings: [], errors: [] }),
    });

    expect(await runCli(validate('--id', ' project-1 '), dependencies)).toBe(0);
    expect(api.validateMonoSpecs).toHaveBeenCalledExactlyOnceWith({ projectPath: '/srv/project-1' });
    expect(stdout.join('')).toContain('MonoSpecs configuration is valid.');
  });

  it('prints warnings for a valid configuration and still exits 0', async () => {
    const { dependencies, stdout } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: true, config: null, warnings: ['repo directory missing'], errors: [] }),
    });

    expect(await runCli(validate('--id', 'project-1'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('  - repo directory missing');
  });

  it('prints the config version and repository directory in the JSON payload', async () => {
    const { dependencies, stdout } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: true, config: { version: '2.1', repoDirectory: 'checkouts' }, warnings: [], errors: [] }),
    });

    expect(await runCli(validate('--id', 'project-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({
      isValid: true,
      config: { version: '2.1', repoDirectory: 'checkouts' },
      warnings: [],
      errors: [],
    });
  });

  it('rejects a whitespace-only id before any network call', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(validate('--id', '   '), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--id is required.');
    expect(api.listProjects).not.toHaveBeenCalled();
  });

  it('fails with exit 24 when the project is in the snapshot but has no path', async () => {
    const { dependencies, api, stderr } = createDependencies({
      listProjects: vi.fn().mockResolvedValue({ projects: [{ ...createProject('project-1'), path: '' }] }),
    });

    expect(await runCli(validate('--id', 'project-1'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stderr.join('')).toContain('Project project-1 was not found in the aggregation snapshot.');
    expect(api.validateMonoSpecs).not.toHaveBeenCalled();
  });

  it('fails with exit 24 when the snapshot has no project list at all', async () => {
    const { dependencies, api } = createDependencies({ listProjects: vi.fn().mockResolvedValue({}) });

    expect(await runCli(validate('--id', 'project-1'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(api.validateMonoSpecs).not.toHaveBeenCalled();
  });

  it('is only valid when the backend says isValid is exactly true', async () => {
    const { dependencies } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({ errors: ['unknown'] }),
    });

    expect(await runCli(validate('--id', 'project-1'), dependencies)).toBe(EXIT_CODES.OPERATION_FAILED);
  });

  it('names the failure on stderr when invalid', async () => {
    const { dependencies, stderr } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: false, config: null, warnings: [], errors: ['bad yaml'] }),
    });

    expect(await runCli(validate('--id', 'project-1'), dependencies)).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(stderr.join('')).toContain('MonoSpecs configuration is invalid. See the errors above.');
  });
});

describe('hagi project repositories (registerProjectRepositoriesCommand)', () => {
  const repositories = (...args: string[]) => ['node', 'hagi', 'project', 'repositories', ...args];
  const withProjects = (projects: unknown[]) => ({ listProjects: vi.fn().mockResolvedValue({ projects }) });

  it('exports the registration function the project group calls', () => {
    expect(typeof registerProjectRepositoriesCommand).toBe('function');
  });

  it('finds the project by its trimmed id', async () => {
    const { dependencies, stdout } = createDependencies(withProjects([createProjectWithRepositories('project-1')]));

    expect(await runCli(repositories('--id', '  project-1 '), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('repos/cli');
  });

  it('picks the matching project among several', async () => {
    const { dependencies, stdout } = createDependencies(
      withProjects([{ ...createProject('other'), name: 'Other project' }, createProjectWithRepositories('project-1')]),
    );

    expect(await runCli(repositories('--id', 'project-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).projectId).toBe('project-1');
  });

  it('says so when the project lists no repositories', async () => {
    const { dependencies, stdout } = createDependencies(withProjects([createProject('project-1')]));

    expect(await runCli(repositories('--id', 'project-1'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('This project lists no repositories.');
  });

  it('prints an empty repository list as JSON for a project without repositories', async () => {
    const { dependencies, stdout } = createDependencies(withProjects([createProject('project-1')]));

    expect(await runCli(repositories('--id', 'project-1', '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({ projectId: 'project-1', isMonoSpecs: false, hasError: false, repositories: [] });
  });

  it('shows a default explanation when the project failed to load without an error message', async () => {
    const { dependencies, stdout } = createDependencies(withProjects([{ ...createProject('project-1'), hasError: true }]));

    expect(await runCli(repositories('--id', 'project-1'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('The project failed to load; its repository list may be incomplete.');
  });

  it('shows the backend error message when there is one', async () => {
    const { dependencies, stdout } = createDependencies(withProjects([{ ...createProject('project-1'), hasError: true, error: 'git unavailable' }]));

    expect(await runCli(repositories('--id', 'project-1'), dependencies)).toBe(0);
    expect(stdout.join('')).toContain('git unavailable');
  });

  it('fails with exit 24 for an unknown project', async () => {
    const { dependencies, stderr } = createDependencies(withProjects([createProject('other')]));

    expect(await runCli(repositories('--id', 'missing'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stderr.join('')).toContain('Project missing was not found in the aggregation snapshot.');
  });

  it('fails with exit 24 when the snapshot has no project list', async () => {
    const { dependencies } = createDependencies({ listProjects: vi.fn().mockResolvedValue({}) });

    expect(await runCli(repositories('--id', 'project-1'), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
  });

  it('fails without --id', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(repositories(), dependencies)).not.toBe(0);
    expect(api.listProjects).not.toHaveBeenCalled();
  });
});

describe('registerProposalCommands (src/commands/proposal.ts)', () => {
  function register() {
    const made = createDependencies();
    const program = new Command('hagi');
    registerProposalCommands(program, made.dependencies);
    return { ...made, program, group: program.commands.find(command => command.name() === 'proposal') };
  }

  it('adds a single proposal group that describes the stages it manages', () => {
    const { program, group } = register();

    expect(program.commands.map(command => command.name())).toEqual(['proposal']);
    expect(group?.description()).toContain('Manage proposal sessions');
    expect(group?.description()).toContain('--wait');
  });

  it('registers the thirteen subcommands in order', () => {
    const { group } = register();

    expect(group?.commands.map(command => command.name())).toEqual([
      'list',
      'create',
      'optimize-description',
      'generate',
      'annotate',
      'execute',
      'archive',
      'status',
      'get',
      'messages',
      'answer',
      'complete',
      'send',
    ]);
  });

  it('gives every subcommand a description', () => {
    const { group } = register();

    for (const command of group?.commands ?? []) {
      expect(command.description(), command.name()).not.toBe('');
    }
  });

  it('makes no backend call while registering', () => {
    const { api } = register();

    for (const method of ['listSessions', 'createProposalSession', 'optimizeProposal', 'generateProposal', 'executeProposal', 'archiveProposal', 'sendMessage'] as const) {
      expect(api[method], method).not.toHaveBeenCalled();
    }
  });
});

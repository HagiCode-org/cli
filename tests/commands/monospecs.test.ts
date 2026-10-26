import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createMonoSpecsDocument, createProject } from './testHelpers';

const CLI = ['node', 'hagi', 'project', 'monospecs'];

function fieldErrorBody() {
  return {
    error: 'MonoSpecs configuration is invalid.',
    fieldErrors: [{ field: 'repositories[1].path', code: 'MONOSPECS_DUPLICATE_REPOSITORY_PATH', message: 'Duplicate repository path.' }],
  };
}

describe('project monospecs show', () => {
  it('prints the summary and one row per repository in human mode', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli([...CLI, 'show', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.getMonoSpecsManagement).toHaveBeenCalledWith('project-1');
    const output = stdout.join('');
    expect(output).toContain('repoDirectory');
    expect(output).toContain('monospecs.yaml');
    expect(output).toContain('commitWhenArchive');
    expect(output).toContain('repos/cli');
    expect(output).toContain('repos/web');
    expect(output).toContain('main, synced');
    expect(output).not.toContain('YAML');
  });

  it('marks a repository that is not a valid Git checkout and prints no branch for it', async () => {
    const { dependencies, stdout } = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(
        createMonoSpecsDocument({
          repositories: [
            { name: 'web', path: 'repos/web', url: 'https://example.test/web.git', type: 'frontend', isValidGitRepo: false, branch: 'feature/x', syncState: 'behind' },
          ],
        }),
      ),
    });
    const exitCode = await runCli([...CLI, 'show', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    const row = stdout.join('').split('\n').find(line => line.includes('repos/web')) ?? '';
    expect(row).toContain('missing or not a Git repository');
    expect(row).not.toContain('feature/x');
  });

  it('prints the YAML preview only with --yaml', async () => {
    const { dependencies, stdout } = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ yamlPreview: 'version: "9.9"\n' })),
    });
    expect(await runCli([...CLI, 'show', '--id', 'project-1', '--yaml'], dependencies)).toBe(0);
    expect(stdout.join('')).toContain('version: "9.9"');

    const plain = createDependencies({
      getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ yamlPreview: 'version: "9.9"\n' })),
    });
    expect(await runCli([...CLI, 'show', '--id', 'project-1'], plain.dependencies)).toBe(0);
    expect(plain.stdout.join('')).not.toContain('version: "9.9"');
  });

  it('emits the document in JSON with configured, local-state, code and metadata fields', async () => {
    const { dependencies, stdout } = createDependencies();
    const exitCode = await runCli([...CLI, 'show', '--id', 'project-1', '--json'], dependencies);

    expect(exitCode).toBe(0);
    const payload = JSON.parse(stdout.join(''));
    expect(payload).toMatchObject({
      version: '1.0',
      repoDirectory: 'repos',
      configPath: '/tmp/project/monospecs.yaml',
      commitWhenArchive: false,
      metadata: [{ key: 'owner', value: 'hagi', valueKind: 'string' }],
    });
    expect(payload.yamlPreview).toContain('version');
    expect(payload.repositories[0]).toMatchObject({
      name: 'cli',
      code: 'CLI',
      path: 'repos/cli',
      metadata: [{ key: 'team', value: 'tools', valueKind: 'string' }],
      isValidGitRepo: true,
      branch: 'main',
      syncState: 'synced',
    });
  });

  it('fails with exit 24 and the backend message when the project does not exist', async () => {
    const { dependencies, stdout, stderr } = createDependencies({
      getMonoSpecsManagement: vi.fn().mockRejectedValue(createApiError(404, { error: 'Project not found.' })),
    });
    const exitCode = await runCli([...CLI, 'show', '--id', 'missing'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
    expect(stderr.join('')).toContain('Project not found.');
  });
});

describe('project monospecs init', () => {
  it('initializes a fresh project and prints the empty document', async () => {
    const { dependencies, api, stdout } = createDependencies({
      initializeMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ repositories: [] })),
    });
    const exitCode = await runCli([...CLI, 'init', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.initializeMonoSpecsManagement).toHaveBeenCalledWith('project-1');
    expect(stdout.join('')).toContain('MonoSpecs configuration initialized.');
    expect(stdout.join('')).toContain('lists no repositories');
  });

  it('prints the existing document for an already initialized project without claiming an overwrite', async () => {
    const { dependencies, stdout } = createDependencies({
      initializeMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument()),
    });
    const exitCode = await runCli([...CLI, 'init', '--id', 'project-1', '--json'], dependencies);

    expect(exitCode).toBe(0);
    const output = stdout.join('');
    expect(output).not.toContain('overwritten');
    expect(JSON.parse(output).repositories).toHaveLength(2);
  });

  it('fails with exit 20 and lists every field error when the backend rejects the configuration', async () => {
    const { dependencies, stderr } = createDependencies({
      initializeMonoSpecsManagement: vi.fn().mockRejectedValue(createApiError(400, fieldErrorBody())),
    });
    const exitCode = await runCli([...CLI, 'init', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    const message = stderr.join('');
    expect(message).toContain('MonoSpecs configuration is invalid.');
    expect(message).toContain('repositories[1].path: Duplicate repository path.');
  });
});

describe('project monospecs reload', () => {
  it('calls the reload operation and prints the returned document', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli([...CLI, 'reload', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.reloadMonoSpecsManagement).toHaveBeenCalledWith('project-1');
    expect(stdout.join('')).toContain('MonoSpecs configuration reloaded.');
    expect(stdout.join('')).toContain('repos/web');
  });
});

describe('project monospecs set', () => {
  it('changes one metadata field and keeps the other fields and repositories', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--commit-when-archive', 'true'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.getMonoSpecsManagement).toHaveBeenCalledWith('project-1');
    const [id, body] = vi.mocked(api.saveMonoSpecsManagement).mock.calls[0];
    expect(id).toBe('project-1');
    expect(body).toMatchObject({ version: '1.0', repoDirectory: 'repos', commitWhenArchive: true });
    expect(body.repositories.map(repository => repository.path)).toEqual(['repos/cli', 'repos/web']);
  });

  it('strips runtime fields from every saved repository', async () => {
    const { dependencies, api } = createDependencies();
    await runCli([...CLI, 'set', '--id', 'project-1', '--version', '2.0'], dependencies);

    const [, body] = vi.mocked(api.saveMonoSpecsManagement).mock.calls[0];
    for (const repository of body.repositories) {
      for (const field of ['isValidGitRepo', 'branch', 'trackingBranch', 'aheadCount', 'behindCount', 'hasUncommittedChanges', 'unpushedCommitCount', 'hasTrackingBranch', 'syncState']) {
        expect(repository).not.toHaveProperty(field);
      }
    }
    expect(body.repositories[0]).toEqual({
      name: 'cli',
      code: 'CLI',
      path: 'repos/cli',
      url: 'https://github.com/HagiCode-org/cli.git',
      displayName: 'CLI',
      type: 'library',
      icon: null,
      optional: false,
      tags: ['cli'],
      metadata: [{ key: 'team', value: 'tools', valueKind: 'string' }],
    });
  });

  it('keeps the document-level metadata and repository code and metadata unchanged', async () => {
    const { dependencies, api } = createDependencies();
    await runCli([...CLI, 'set', '--id', 'project-1', '--repo-directory', 'docs'], dependencies);

    const [, body] = vi.mocked(api.saveMonoSpecsManagement).mock.calls[0];
    expect(body.repoDirectory).toBe('docs');
    expect(body.metadata).toEqual([{ key: 'owner', value: 'hagi', valueKind: 'string' }]);
    expect(body.repositories[0].code).toBe('CLI');
    expect(body.repositories[0].metadata).toEqual([{ key: 'team', value: 'tools', valueKind: 'string' }]);
  });

  it('adds a repository with its URL and prints the normalized document', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      [...CLI, 'set', '--id', 'project-1', '--add-repository', 'repos/api', '--url', 'https://github.com/HagiCode-org/api.git'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    const [, body] = vi.mocked(api.saveMonoSpecsManagement).mock.calls[0];
    expect(body.repositories).toHaveLength(3);
    expect(body.repositories[2]).toMatchObject({
      name: 'api',
      path: 'repos/api',
      url: 'https://github.com/HagiCode-org/api.git',
      optional: false,
    });
    expect(stdout.join('')).toContain('MonoSpecs configuration saved.');
  });

  it('removes a configured repository and keeps every other entry', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--remove-repository', 'repos/web'], dependencies);

    expect(exitCode).toBe(0);
    const [, body] = vi.mocked(api.saveMonoSpecsManagement).mock.calls[0];
    expect(body.repositories.map(repository => repository.path)).toEqual(['repos/cli']);
  });

  it('rejects companion options with several additions before any request', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli(
      [...CLI, 'set', '--id', 'project-1', '--add-repository', 'repos/a', '--add-repository', 'repos/b', '--url', 'https://x.test/a.git'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
    expect(api.saveMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('rejects an addition whose path is already configured without saving', async () => {
    const { dependencies, api, stderr } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--add-repository', 'repos/cli/'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('repos/cli');
    expect(api.saveMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('rejects removal of a path that is not configured without saving', async () => {
    const { dependencies, api, stderr } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--remove-repository', 'repos/nope'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('repos/nope');
    expect(api.saveMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('fails with a usage error listing the options when no change is requested', async () => {
    const { dependencies, api, stderr } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('--add-repository');
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
    expect(api.saveMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('rejects an invalid --commit-when-archive value', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--commit-when-archive', 'yes'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.saveMonoSpecsManagement).not.toHaveBeenCalled();
  });

  it('clones exactly the added paths after saving with --clone', async () => {
    const { dependencies, api, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
        results: [{ path: 'repos/api', status: 'cloned', message: 'Cloned.' }],
      }),
    });
    const exitCode = await runCli(
      [...CLI, 'set', '--id', 'project-1', '--add-repository', 'repos/api', '--url', 'https://github.com/HagiCode-org/api.git', '--clone'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.saveMonoSpecsManagement).toHaveBeenCalledOnce();
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledWith('project-1', { paths: ['repos/api'], includeOptional: false });
    expect(stdout.join('')).toContain('Clone results');
  });

  it('exits 30 after a failed clone and keeps the saved configuration', async () => {
    const { dependencies, api, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
        results: [{ path: 'repos/api', status: 'failed', message: 'Remote unreachable.' }],
      }),
    });
    const exitCode = await runCli(
      [...CLI, 'set', '--id', 'project-1', '--add-repository', 'repos/api', '--url', 'https://github.com/HagiCode-org/api.git', '--clone'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(api.saveMonoSpecsManagement).toHaveBeenCalledOnce();
    expect(stdout.join('')).toContain('Remote unreachable.');
  });

  it('rejects --clone without an addition before any request', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--remove-repository', 'repos/web', '--clone'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.getMonoSpecsManagement).not.toHaveBeenCalled();
    expect(api.cloneMonoSpecsRepositories).not.toHaveBeenCalled();
  });

  it('surfaces backend field errors with exit 20', async () => {
    const { dependencies, stderr } = createDependencies({
      saveMonoSpecsManagement: vi.fn().mockRejectedValue(createApiError(400, fieldErrorBody())),
    });
    const exitCode = await runCli([...CLI, 'set', '--id', 'project-1', '--version', '2.0'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stderr.join('')).toContain('repositories[1].path: Duplicate repository path.');
  });
});

describe('project monospecs validate', () => {
  it('validates the project path resolved from the aggregation snapshot', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli([...CLI, 'validate', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.listProjects).toHaveBeenCalledOnce();
    expect(api.validateMonoSpecs).toHaveBeenCalledWith({ projectPath: '/tmp/project' });
    expect(stdout.join('')).toContain('MonoSpecs configuration is valid.');
  });

  it('prints every error and exits 30 for an invalid configuration', async () => {
    const { dependencies, stdout } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({
        isValid: false,
        config: { version: '1.0', repoDirectory: 'repos' },
        warnings: ['Repository repos/web is not cloned.'],
        errors: ['Repository path repos/api escapes the project root.'],
      }),
    });
    const exitCode = await runCli([...CLI, 'validate', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.OPERATION_FAILED);
    const output = stdout.join('');
    expect(output).toContain('MonoSpecs configuration is invalid.');
    expect(output).toContain('Repository repos/web is not cloned.');
    expect(output).toContain('Repository path repos/api escapes the project root.');
  });

  it('prints the invalid result as JSON and still exits 30', async () => {
    const { dependencies, stdout } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: false, config: null, warnings: [], errors: ['Malformed YAML.'] }),
    });
    const exitCode = await runCli([...CLI, 'validate', '--id', 'project-1', '--json'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.OPERATION_FAILED);
    expect(JSON.parse(stdout.join(''))).toEqual({ isValid: false, config: null, warnings: [], errors: ['Malformed YAML.'] });
  });

  it('prints the JSON shape with empty arrays for absent lists', async () => {
    const { dependencies, stdout } = createDependencies({
      validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: true, config: null, warnings: null, errors: null }),
    });
    const exitCode = await runCli([...CLI, 'validate', '--id', 'project-1', '--json'], dependencies);

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ isValid: true, config: null, warnings: [], errors: [] });
  });

  it('fails with exit 24 and does not call validation when the project is not in the snapshot', async () => {
    const { dependencies, api } = createDependencies({
      listProjects: vi.fn().mockResolvedValue({ projects: [createProject('project-2')] }),
    });
    const exitCode = await runCli([...CLI, 'validate', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(api.validateMonoSpecs).not.toHaveBeenCalled();
  });
});

describe('project monospecs clone', () => {
  it('clones every missing repository without paths and prints one row per result', async () => {
    const { dependencies, api, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
        results: [
          { path: 'repos/cli', status: 'alreadyPresent', message: 'Already present.' },
          { path: 'repos/web', status: 'cloned', message: 'Cloned.' },
        ],
      }),
    });
    const exitCode = await runCli([...CLI, 'clone', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledWith('project-1', { includeOptional: false });
    const output = stdout.join('');
    expect(output).toContain('alreadyPresent');
    expect(output).toContain('repos/web');
  });

  it('sends exactly the selected paths', async () => {
    const { dependencies, api } = createDependencies();
    expect(await runCli([...CLI, 'clone', '--id', 'project-1', '--path', 'repos/web', '--path', 'repos/cli'], dependencies)).toBe(0);
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledWith('project-1', {
      paths: ['repos/web', 'repos/cli'],
      includeOptional: false,
    });
  });

  it('sets includeOptional with --include-optional', async () => {
    const { dependencies, api } = createDependencies();
    expect(await runCli([...CLI, 'clone', '--id', 'project-1', '--include-optional'], dependencies)).toBe(0);
    expect(api.cloneMonoSpecsRepositories).toHaveBeenCalledWith('project-1', { includeOptional: true });
  });

  it('prints every row and exits 30 when some clones fail', async () => {
    const { dependencies, stdout } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
        results: [
          { path: 'repos/cli', status: 'cloned', message: 'Cloned.' },
          { path: 'repos/web', status: 'failed', message: 'Authentication failed.' },
        ],
      }),
    });
    const exitCode = await runCli([...CLI, 'clone', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.OPERATION_FAILED);
    const output = stdout.join('');
    expect(output).toContain('repos/cli');
    expect(output).toContain('Authentication failed.');
  });

  it('emits the results as JSON', async () => {
    const { dependencies, stdout } = createDependencies();
    expect(await runCli([...CLI, 'clone', '--id', 'project-1', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({
      results: [{ path: 'repos/web', status: 'cloned', message: 'Cloned.' }],
    });
  });

  it('exits 29 when the backend is busy', async () => {
    const { dependencies } = createDependencies({
      cloneMonoSpecsRepositories: vi.fn().mockRejectedValue(createApiError(409, { error: 'Another repository operation is running.' })),
    });
    expect(await runCli([...CLI, 'clone', '--id', 'project-1'], dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
  });
});

describe('project monospecs remove-checkout', () => {
  it('removes a clean checkout without force and prints the removed path', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli([...CLI, 'remove-checkout', '--id', 'project-1', '--path', 'repos/web'], dependencies);

    expect(exitCode).toBe(0);
    expect(api.removeMonoSpecsRepositoryCheckout).toHaveBeenCalledWith('project-1', 'repos/web', false);
    expect(stdout.join('')).toContain('Removed checkout repos/web');
  });

  it('suggests --force when the blocking condition can be overridden', async () => {
    const { dependencies, stderr } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(
        createApiError(409, { error: "Refusing to remove 'repos/web' with uncommitted changes. Use force to remove it anyway." }),
      ),
    });
    const exitCode = await runCli([...CLI, 'remove-checkout', '--id', 'project-1', '--path', 'repos/web'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stderr.join('')).toContain('uncommitted changes');
    expect(stderr.join('')).toContain('--force');
  });

  it('does not suggest --force for a refusal that force cannot override', async () => {
    const { dependencies, stderr } = createDependencies({
      removeMonoSpecsRepositoryCheckout: vi.fn().mockRejectedValue(
        createApiError(409, { error: 'Refusing to remove a path that is not the root of a standalone repository.' }),
      ),
    });
    const exitCode = await runCli([...CLI, 'remove-checkout', '--id', 'project-1', '--path', 'repos/web'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stderr.join('')).not.toContain('--force');
  });

  it('sends force true with --force', async () => {
    const { dependencies, api } = createDependencies();
    expect(await runCli([...CLI, 'remove-checkout', '--id', 'project-1', '--path', 'repos/web', '--force'], dependencies)).toBe(0);
    expect(api.removeMonoSpecsRepositoryCheckout).toHaveBeenCalledWith('project-1', 'repos/web', true);
  });

  it('fails with a usage error and no request when --path is missing', async () => {
    const { dependencies, api } = createDependencies();
    const exitCode = await runCli([...CLI, 'remove-checkout', '--id', 'project-1'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.removeMonoSpecsRepositoryCheckout).not.toHaveBeenCalled();
  });
});

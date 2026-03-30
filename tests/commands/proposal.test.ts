import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import type { AppDependencies, CliIo } from '../../src/runtime/commandContext';
import type { ProposalApi } from '../../src/runtime/proposalApi';
import { ApiError } from '../../src/generated/api/core/ApiError';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { EXIT_CODES } from '../../src/runtime/errors';

function createApiError(status: number, body: unknown): ApiError {
  return new ApiError(
    {
      method: 'POST',
      url: '/api/Sessions',
      path: {},
      query: {},
      formData: {},
      headers: {},
      cookies: {},
      errors: {},
    },
    {
      url: 'https://api.example/api/Sessions',
      ok: false,
      status,
      statusText: 'Error',
      body,
    },
    'Backend error',
  );
}

function createSession(sessionId: string) {
  return {
    sessionId: { value: sessionId },
    title: 'CLI proposal management',
    description: 'desc',
    chiefComplaint: 'complaint',
    code: 12,
    type: PCode_Models_SessionType.PROPOSAL,
    status: PCode_Models_SessionStatus.DRAFTING,
    isActive: true,
    lastActiveAt: '2026-03-30T00:00:00Z',
    projectId: { value: 'project-1' },
    projectName: 'Project',
    projectPath: '/tmp/project',
    isMonoSpecs: false,
    subRepositories: null,
    proposalName: null,
    openSpecFiles: undefined,
    pendingMessageCount: 0,
    queueMessages: null,
    enableIndependentWorkspace: true,
    workingDirectory: '/tmp/project/.worktrees/session-1',
    baseBranch: 'main',
    workspaceBranchName: 'proposal/session-1',
    metadata: null,
    chatExecutorType: undefined,
    chatHero: undefined,
    stageExecutorMap: null,
    stageHeroSelectionMap: null,
  };
}

function createDependencies(apiOverrides: Partial<ProposalApi> = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const io: CliIo = {
    stdout: value => {
      stdout.push(value);
    },
    stderr: value => {
      stderr.push(value);
    },
  };

  const api: ProposalApi = {
    listSessions: vi.fn().mockResolvedValue({ sessions: [createSession('session-1')] }),
    createSession: vi.fn().mockResolvedValue(createSession('session-2')),
    generateProposalName: vi.fn().mockResolvedValue({ proposalName: 'cli-proposal-management' }),
    generateProposal: vi.fn().mockResolvedValue({ message: 'Proposal generation started' }),
    executeProposal: vi.fn().mockResolvedValue({ message: 'Proposal execution started' }),
    ...apiOverrides,
  };

  const dependencies: AppDependencies = {
    api,
    env: {},
    io,
  };

  return {
    dependencies,
    api,
    stdout,
    stderr,
  };
}

describe('proposal commands', () => {
  it('lists proposal sessions through the session API in json mode', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'proposal', 'list', '--project-id', 'project-1', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.listSessions).toHaveBeenCalledWith({
      type: PCode_Models_SessionType.PROPOSAL,
      projectId: 'project-1',
      projectIds: undefined,
      activeOnly: undefined,
      includeArchived: undefined,
    });
    expect(stdout.join('')).toContain('"sessionId": "session-1"');
  });

  it('creates a proposal session and prints next-step guidance', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      [
        'node',
        'hagi',
        'proposal',
        'create',
        '--project-id',
        'project-1',
        '--chief-complaint',
        'Add proposal CLI commands',
        '--default-title',
        '--json',
      ],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Proposal',
        projectId: 'project-1',
        chiefComplaint: 'Add proposal CLI commands',
        type: PCode_Models_SessionType.PROPOSAL,
        isDefaultTitle: true,
      }),
    );
    expect(stdout.join('')).toContain('"nextCommand": "hagi proposal generate-name --session-id session-2"');
  });

  it('prints proposal name generation guidance', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'proposal', 'generate-name', '--session-id', 'session-3', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.generateProposalName).toHaveBeenCalledWith('session-3');
    expect(stdout.join('')).toContain('"proposalName": "cli-proposal-management"');
  });

  it('starts proposal generation with request body options', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      [
        'node',
        'hagi',
        'proposal',
        'generate',
        '--session-id',
        'session-4',
        '--enable-explore-mode',
        '--hero-id',
        'hero-1',
        '--json',
      ],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.generateProposal).toHaveBeenCalledWith('session-4', {
      enableExploreMode: true,
      heroId: 'hero-1',
    });
    expect(stdout.join('')).toContain('"message": "Proposal generation started"');
  });

  it('starts proposal execution explicitly by session id', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const exitCode = await runCli(
      ['node', 'hagi', 'proposal', 'execute', '--session-id', 'session-5', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.executeProposal).toHaveBeenCalledWith('session-5', { heroId: undefined });
    expect(stdout.join('')).toContain('"message": "Proposal execution started"');
  });

  it('surfaces representative 400, 404, and 409 backend failures', async () => {
    const badRequest = createDependencies({
      createSession: vi.fn().mockRejectedValue(createApiError(400, { error: 'Bad input' })),
    });
    const notFound = createDependencies({
      generateProposal: vi.fn().mockRejectedValue(createApiError(404, { error: 'Session not found' })),
    });
    const conflict = createDependencies({
      generateProposalName: vi.fn().mockRejectedValue(
        createApiError(409, { error: 'Proposal name already exists for this session' }),
      ),
    });

    await expect(
      runCli(
        [
          'node',
          'hagi',
          'proposal',
          'create',
          '--project-id',
          'project-1',
          '--chief-complaint',
          'Need a CLI',
          '--default-title',
          '--json',
        ],
        badRequest.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(badRequest.stderr.join('')).toContain('"status": 400');

    await expect(
      runCli(
        ['node', 'hagi', 'proposal', 'generate', '--session-id', 'missing-session', '--json'],
        notFound.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(notFound.stderr.join('')).toContain('"status": 404');

    await expect(
      runCli(
        ['node', 'hagi', 'proposal', 'generate-name', '--session-id', 'session-7', '--json'],
        conflict.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(conflict.stderr.join('')).toContain('"status": 409');
  });
});

import { vi } from 'vitest';
import { ApiError } from '../../src/generated/api/core/ApiError';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import type { AppDependencies, CliIo } from '../../src/runtime/commandContext';
import type { HagiApi } from '../../src/runtime/hagiApi';

export function createApiError(status: number, body: unknown): ApiError {
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

export function createSession(sessionId: string, type: PCode_Models_SessionType = PCode_Models_SessionType.PROPOSAL) {
  return {
    sessionId: { value: sessionId },
    title: type === PCode_Models_SessionType.PROPOSAL ? 'CLI proposal management' : 'CLI chat session',
    description: 'desc',
    chiefComplaint: type === PCode_Models_SessionType.PROPOSAL ? 'complaint' : null,
    code: 12,
    type,
    status: PCode_Models_SessionStatus.DRAFTING,
    isActive: true,
    lastActiveAt: '2026-03-30T00:00:00Z',
    projectId: { value: 'project-1' },
    projectName: 'Project',
    projectPath: '/tmp/project',
    isMonoSpecs: false,
    subRepositories: null,
    proposalName: type === PCode_Models_SessionType.PROPOSAL ? null : undefined,
    openSpecFiles: undefined,
    pendingMessageCount: 0,
    queueMessages: null,
    enableIndependentWorkspace: type === PCode_Models_SessionType.PROPOSAL,
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

export function createProject(id: string) {
  return {
    id,
    name: 'Project',
    path: '/tmp/project',
    description: 'desc',
    isMonoSpecs: false,
    monoSpecsVersion: null,
    monoSpecsRepoDirectory: null,
    monoSpecsCommitWhenArchive: null,
  };
}

export function createDependencies(apiOverrides: Partial<HagiApi> = {}) {
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

  const api: HagiApi = {
    listSessions: vi.fn().mockResolvedValue({ sessions: [createSession('session-1')] }),
    getSession: vi.fn().mockResolvedValue(createSession('session-1')),
    createProposalSession: vi.fn().mockResolvedValue(createSession('session-2')),
    createChatSession: vi.fn().mockResolvedValue(createSession('chat-1', PCode_Models_SessionType.CHAT)),
    createAutoTaskSession: vi.fn().mockResolvedValue(createSession('autotask-1', PCode_Models_SessionType.CHAT)),
    updateSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    sendMessage: vi.fn().mockResolvedValue({ message: 'Queued' }),
    generateProposalName: vi.fn().mockResolvedValue({ proposalName: 'cli-proposal-management' }),
    optimizeDescription: vi.fn().mockResolvedValue({ sessionId: 'session-1', taskId: 'task-1', status: 'Started' }),
    generateProposal: vi.fn().mockResolvedValue({ message: 'Proposal generation started' }),
    executeProposal: vi.fn().mockResolvedValue({ message: 'Proposal execution started' }),
    archiveProposal: vi.fn().mockResolvedValue(createSession('session-1')),
    completeProposal: vi.fn().mockResolvedValue({ ...createSession('session-1'), status: PCode_Models_SessionStatus.COMPLETED }),
    submitAnnotations: vi.fn().mockResolvedValue({ message: 'Annotations submitted', annotationCount: 1, fileCount: 1 }),
    listProjects: vi.fn().mockResolvedValue({ projects: [createProject('project-1')] }),
    createProject: vi.fn().mockResolvedValue(createProject('project-2')),
    updateProject: vi.fn().mockResolvedValue({ ...createProject('project-1'), description: 'updated' }),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    archiveChat: vi.fn().mockResolvedValue({ message: 'Archived' }),
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

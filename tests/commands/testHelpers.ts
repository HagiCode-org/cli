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

export function createVault(
  id: string,
  overrides: Partial<{
    name: string;
    type: string;
    physicalPath: string;
    gitUrl: string | null;
    createdAtUtc: string;
    updatedAtUtc: string;
    bootstrapDiagnostics: Array<{
      severity?: string | null;
      code?: string | null;
      message?: string | null;
      relativePath?: string | null;
    }> | null;
  }> = {},
) {
  return {
    id,
    name: overrides.name ?? 'Main Vault',
    type: overrides.type ?? 'obsidian',
    physicalPath: overrides.physicalPath ?? '/vaults/main',
    gitUrl: overrides.gitUrl ?? null,
    createdAtUtc: overrides.createdAtUtc ?? '2026-04-01T00:00:00Z',
    updatedAtUtc: overrides.updatedAtUtc ?? '2026-04-02T00:00:00Z',
    bootstrapDiagnostics: overrides.bootstrapDiagnostics ?? [],
  };
}

export function createVaultFileEntry(
  relativePath: string,
  overrides: Partial<{
    fileName: string;
    isDirectory: boolean;
    extension: string;
    sizeBytes: number;
    lastModifiedUtc: string;
    previewSupported: boolean;
  }> = {},
) {
  const fileName = relativePath.split('/').filter(Boolean).at(-1) ?? relativePath;

  return {
    relativePath,
    fileName: overrides.fileName ?? fileName,
    isDirectory: overrides.isDirectory ?? false,
    extension: overrides.extension ?? '.md',
    sizeBytes: overrides.sizeBytes ?? 128,
    lastModifiedUtc: overrides.lastModifiedUtc ?? '2026-04-03T00:00:00Z',
    previewSupported: overrides.previewSupported ?? true,
  };
}

export function createVaultFileListResponse(
  overrides: Partial<{
    vaultId: string;
    vaultName: string;
    physicalPath: string;
    status: string;
    errorCode: string | null;
    message: string | null;
    isTruncated: boolean;
    totalFileCount: number;
    items: Array<ReturnType<typeof createVaultFileEntry>> | null;
  }> = {},
) {
  const items = overrides.items ?? [createVaultFileEntry('docs/readme.md')];

  return {
    vaultId: overrides.vaultId ?? 'vault-1',
    vaultName: overrides.vaultName ?? 'Main Vault',
    physicalPath: overrides.physicalPath ?? '/vaults/main',
    status: overrides.status ?? 'ready',
    errorCode: overrides.errorCode ?? null,
    message: overrides.message ?? null,
    isTruncated: overrides.isTruncated ?? false,
    totalFileCount: overrides.totalFileCount ?? items.length,
    items,
  };
}

export function createVaultFilePreview(
  overrides: Partial<{
    vaultId: string;
    vaultName: string;
    physicalPath: string;
    relativePath: string;
    fileName: string;
    extension: string;
    sizeBytes: number;
    lastModifiedUtc: string | null;
    status: string;
    errorCode: string | null;
    message: string | null;
    previewSupported: boolean;
    contentTruncated: boolean;
    content: string | null;
  }> = {},
) {
  return {
    vaultId: overrides.vaultId ?? 'vault-1',
    vaultName: overrides.vaultName ?? 'Main Vault',
    physicalPath: overrides.physicalPath ?? '/vaults/main',
    relativePath: overrides.relativePath ?? 'docs/readme.md',
    fileName: overrides.fileName ?? 'readme.md',
    extension: overrides.extension ?? '.md',
    sizeBytes: overrides.sizeBytes ?? 128,
    lastModifiedUtc: overrides.lastModifiedUtc ?? '2026-04-03T00:00:00Z',
    status: overrides.status ?? 'ready',
    errorCode: overrides.errorCode ?? null,
    message: overrides.message ?? null,
    previewSupported: overrides.previewSupported ?? true,
    contentTruncated: overrides.contentTruncated ?? false,
    content: overrides.content ?? '# Preview content',
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
    listVaults: vi.fn().mockResolvedValue({ generatedAtUtc: '2026-04-05T00:00:00Z', items: [createVault('vault-1')] }),
    createVault: vi.fn().mockResolvedValue(createVault('vault-2')),
    updateVault: vi.fn().mockResolvedValue({ ...createVault('vault-1'), name: 'Updated Vault' }),
    deleteVault: vi.fn().mockResolvedValue({
      id: 'vault-1',
      deleted: true,
      deleteLocalFilesRequested: false,
      localFilesDeletionStatus: 'not-requested',
      localFilesDeleted: false,
    }),
    listVaultFiles: vi.fn().mockResolvedValue(createVaultFileListResponse()),
    previewVaultFile: vi.fn().mockResolvedValue(createVaultFilePreview()),
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

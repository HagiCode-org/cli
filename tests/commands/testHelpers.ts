import { vi } from 'vitest';
import { ApiError } from '../../src/generated/api/core/ApiError';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import type { AppDependencies, CliIo } from '../../src/runtime/commandContext';
import type { HagiApi } from '../../src/runtime/hagiApi';

/** Base URL injected through HAGI_API_BASE_URL so command tests never depend on a real config file. */
export const TEST_BASE_URL = 'https://backend.test';

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

export function createProjectWithRepositories(id: string) {
  return {
    ...createProject(id),
    isMonoSpecs: true,
    repositories: [
      {
        name: 'cli',
        path: 'repos/cli',
        relativePath: 'repos/cli',
        displayName: 'CLI',
        type: 'library',
        branch: 'main',
        isValidGitRepo: true,
      },
      {
        name: 'web',
        path: 'repos/web',
        relativePath: 'repos/web',
        displayName: 'Web',
        type: 'frontend',
        branch: 'feature/x',
        isValidGitRepo: true,
      },
    ],
  };
}

/**
 * MonoSpecs management document in the backend response shape. Repositories carry the local Git state,
 * the configured `code` and `metadata` fields; `overrides.repositories` replaces the default list.
 */
export function createMonoSpecsDocument(
  overrides: Partial<{
    version: string;
    repoDirectory: string;
    configPath: string;
    commitWhenArchive: boolean;
    yamlPreview: string;
    metadata: Array<{ key: string; value: string; valueKind: string }>;
    repositories: Array<Record<string, unknown>>;
  }> = {},
) {
  return {
    version: overrides.version ?? '1.0',
    repoDirectory: overrides.repoDirectory ?? 'repos',
    configPath: overrides.configPath ?? '/tmp/project/monospecs.yaml',
    commitWhenArchive: overrides.commitWhenArchive ?? false,
    yamlPreview: overrides.yamlPreview ?? 'version: "1.0"\n',
    metadata: overrides.metadata ?? [{ key: 'owner', value: 'hagi', valueKind: 'string' }],
    repositories: overrides.repositories ?? [
      {
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
        isValidGitRepo: true,
        branch: 'main',
        hasUncommittedChanges: false,
        unpushedCommitCount: 0,
        hasTrackingBranch: true,
        trackingBranch: 'origin/main',
        aheadCount: 0,
        behindCount: 0,
        syncState: 'synced',
      },
      {
        name: 'web',
        code: null,
        path: 'repos/web',
        url: 'https://github.com/HagiCode-org/web.git',
        displayName: 'Web',
        type: 'frontend',
        icon: null,
        optional: true,
        tags: [],
        metadata: [],
        isValidGitRepo: false,
        branch: null,
        hasUncommittedChanges: false,
        unpushedCommitCount: 0,
        hasTrackingBranch: false,
        trackingBranch: null,
        aheadCount: 0,
        behindCount: 0,
        syncState: null,
      },
    ],
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

/** Recurring HagiTask plan in the backend response shape, enabled and scheduled unless overridden. */
export function createPlan(
  id: string,
  overrides: Partial<{
    type: string;
    name: string;
    enabled: boolean;
    state: string | null;
    nextRunAt: string | null;
    schedule: unknown;
    agentPool: unknown;
    payload: unknown;
  }> = {},
) {
  return {
    id,
    type: overrides.type ?? 'hagitask',
    name: overrides.name ?? 'Nightly review',
    enabled: overrides.enabled ?? true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-02T00:00:00Z',
    schedule: overrides.schedule ?? {
      mode: 'recurring',
      runAt: null,
      timeZone: 'Asia/Shanghai',
      startDate: '2026-04-01',
      endDate: null,
      timeOfDay: '02:00',
      repeat: { rule: 'daily', weekdays: null },
    },
    agentPool: overrides.agentPool ?? { strategy: 'random', agents: [{ heroId: 'hero-1' }] },
    payload: overrides.payload ?? { title: 'Nightly review', message: 'Review the day', projectId: 'project-1' },
    state: overrides.state === undefined ? 'scheduled' : overrides.state,
    nextRunAt: overrides.nextRunAt === undefined ? '2026-05-01T18:00:00Z' : overrides.nextRunAt,
  };
}

/** HagiTask schema summary row in the backend response shape. */
export function createHagiTaskSummary(id: string, overrides: Partial<{ title: string; description: string | null }> = {}) {
  return {
    id,
    groupId: 'hagi-tasks',
    sourceKind: 'bundled',
    version: '1.0.0',
    title: overrides.title ?? 'Compose commit',
    description: overrides.description === undefined ? 'Writes a commit message.' : overrides.description,
    targetCount: 1,
    commandCount: 0,
    parameterCount: 2,
  };
}

/** Creation schema for one HagiTask in the backend response shape, with a required and an optional parameter. */
export function createHagiTaskSchema(id = 'compose-commit') {
  return {
    id,
    version: '1.0.0',
    locale: 'en-US',
    title: 'Compose commit',
    description: 'Writes a commit message.',
    scope: {
      defaultTargetType: 'repository',
      targets: [
        {
          id: 'repositories',
          kind: 'repository',
          selectionMode: 'multi',
          required: true,
          allowedAccessTypes: ['write', 'read'],
          scopeSource: 'project',
          requestKey: 'targets.repositories',
          scopeRequestKey: 'targetScopes.repositories',
        },
      ],
    },
    commands: null,
    parameters: [
      {
        key: 'commitScope',
        origin: 'input',
        producer: null,
        valueType: 'string',
        required: true,
        label: 'Commit scope',
        hint: null,
        options: null,
        aliases: null,
      },
      {
        key: 'language',
        origin: 'input',
        producer: null,
        valueType: 'string',
        required: false,
        label: 'Language',
        hint: null,
        options: [{ value: 'en', label: 'English' }],
        aliases: [{ key: 'lang', deprecated: true }],
      },
    ],
    requirements: [{ type: 'agent', name: 'claude', names: null }],
    scenes: { provider: 'hero', defaultSceneKey: 'default', registrations: [{ sceneKey: 'default', title: 'Default', summary: null, backgroundImageSlot: 0 }] },
    request: {
      method: 'POST',
      path: '/api/Sessions/hagitask',
      presetTaskIdField: 'presetTaskId',
      localeField: 'presetTaskLocale',
      requiredFields: ['title', 'projectId'],
    },
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['commitScope'],
      properties: { commitScope: { type: 'string' } },
    },
    example: {
      title: '<title>',
      projectId: '<project-id>',
      presetTaskId: id,
      presetTaskInput: { inputs: { commitScope: '<commit-scope>' } },
    },
  };
}

const SKILL_TRUST = {
  providerId: 'vercel',
  displayName: 'Vercel',
  badgeLabel: 'Vercel',
  matchedRuleType: 'source',
  matchedRuleValue: 'vercel/skills',
  isPreset: true,
};

export function createLocalSkillInventory() {
  return {
    generatedAtUtc: '2026-10-16T00:00:00Z',
    items: [
      {
        id: 'demo-skill',
        name: 'demo-skill',
        origin: 'user',
        scope: 'global',
        path: '/home/user/.agents/skills/demo-skill',
        agents: ['claude-code', 'codex'],
        managedInstallMetadata: {
          schemaVersion: 1,
          skillId: 'demo-skill',
          source: 'vercel/skills',
          skillSlug: 'demo-skill',
          version: '1.2.0',
          normalizedSkillKey: 'vercel/skills/demo-skill',
          installReference: 'vercel/skills@demo-skill',
          recordedAtUtc: '2026-10-01T00:00:00Z',
        },
      },
      {
        id: 'builtin:hagi',
        name: 'hagi',
        origin: 'built-in',
        scope: 'global',
        path: '/home/user/.hagi/skills/hagi',
        agents: [],
        managedInstallMetadata: null,
        builtIn: {
          enabled: true,
          version: '1.4.0',
          source: 'built-in',
          repository: 'hagicode',
          ref: null,
          path: null,
          contentHash: null,
        },
      },
    ],
  };
}

export function createUninstallResult(skillName: string) {
  return {
    skillName,
    status: 'Succeeded',
    userMessage: 'Skill uninstalled.',
    diagnosticMessage: null,
    occurredAt: '2026-10-16T00:00:00Z',
  };
}

export function createBuiltInAvailabilityResult(slug: string, enabled: boolean, succeeded = true) {
  return {
    slug,
    enabled,
    succeeded,
    userMessage: succeeded ? `Built-in skill ${slug} is now ${enabled ? 'enabled' : 'disabled'}.` : `Unknown built-in skill: ${slug}.`,
    diagnosticMessage: null,
  };
}

export function createSkillGallery() {
  return {
    generatedAtUtc: '2026-10-16T00:00:00Z',
    items: [
      {
        id: 'react-best-practices',
        name: 'React Best Practices',
        source: 'vercel/skills',
        installs: 1280,
        isTrustedSource: true,
        trustedProvider: SKILL_TRUST,
      },
      {
        id: 'react-testing',
        name: 'React Testing',
        source: 'community/skills',
        installs: 14,
        isTrustedSource: false,
        trustedProvider: null,
      },
    ],
    repositoryDiscovery: null,
  };
}

export function createSkillGalleryDetail() {
  return {
    id: 'react-best-practices',
    source: 'vercel/skills',
    skillSlug: 'react-best-practices',
    description: 'Guidance for React components.',
    repositoryName: 'skills',
    repositoryFullName: 'vercel/skills',
    repositoryUrl: 'https://github.com/vercel/skills',
    repositoryDefaultBranch: 'main',
    repositoryPrivate: false,
    isInstallable: true,
    isTrustedSource: true,
    trustedProvider: SKILL_TRUST,
    installReference: 'vercel/skills@react-best-practices',
    installCommandPreview: 'npx skills add vercel/skills --skill react-best-practices',
    installVersion: null,
    installHint: null,
  };
}

export function createSkillInstallResult() {
  return {
    skillId: 'react-best-practices',
    source: 'vercel/skills',
    skillSlug: 'react-best-practices',
    normalizedSkillKey: 'vercel/skills/react-best-practices',
    installReference: 'vercel/skills@react-best-practices',
    commandPreview: 'npx skills add vercel/skills --skill react-best-practices',
    version: '1.2.0',
    status: 'Succeeded',
    userMessage: 'Skill installed.',
    diagnosticMessage: null,
    occurredAt: '2026-10-16T00:00:00Z',
  };
}

export function createTrustedProviderList() {
  return {
    generatedAtUtc: '2026-10-16T00:00:00Z',
    version: 3,
    items: [
      {
        providerId: 'vercel',
        displayName: 'Vercel',
        badgeLabel: 'Vercel',
        isPreset: true,
        isEnabled: true,
        sortOrder: 1,
        ruleCount: 2,
        sourceExamples: ['vercel/skills'],
        matchRules: [{ matchType: 'owner', value: 'vercel' }],
      },
    ],
  };
}

export function createProposalOptimizationBundle(
  overrides: Partial<{ isValid: boolean; diagnostics: Array<{ code: string; message: string }> }> = {},
) {
  const isValid = overrides.isValid ?? true;
  const diagnostics = overrides.diagnostics ?? [];
  return {
    result: {
      optimizedTitle: 'Login fix',
      optimizedProposalName: 'cli-proposal-management',
      optimizedDescription: 'Refined description',
      optimizedProposalMarkdown: '# Proposal',
      validation: { isValid, diagnostics },
    },
    summary: {
      appliedTitle: isValid ? 'Login fix' : '',
      appliedProposalName: isValid ? 'cli-proposal-management' : '',
      proposalDraftAvailable: isValid,
      isValid,
      diagnostics,
    },
    correlationId: 'corr-1',
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
    createHagiTaskSession: vi.fn().mockResolvedValue(createSession('hagitask-1', PCode_Models_SessionType.CHAT)),
    listHagiTaskSchemas: vi.fn().mockResolvedValue([createHagiTaskSummary('compose-commit')]),
    getHagiTaskSchema: vi.fn().mockResolvedValue(createHagiTaskSchema()),
    updateSession: vi.fn().mockResolvedValue(undefined),
    deleteSession: vi.fn().mockResolvedValue({ message: 'Deleted' }),
    sendMessage: vi.fn().mockResolvedValue({ message: 'Queued' }),
    optimizeProposal: vi.fn().mockResolvedValue(createProposalOptimizationBundle()),
    generateProposal: vi.fn().mockResolvedValue({ message: 'Proposal generation started' }),
    executeProposal: vi.fn().mockResolvedValue({ message: 'Proposal execution started' }),
    archiveProposal: vi.fn().mockResolvedValue(createSession('session-1')),
    completeProposal: vi.fn().mockResolvedValue({ ...createSession('session-1'), status: PCode_Models_SessionStatus.COMPLETED }),
    submitAnnotations: vi.fn().mockResolvedValue({ message: 'Annotations submitted', annotationCount: 1, fileCount: 1 }),
    listProjects: vi.fn().mockResolvedValue({ projects: [createProject('project-1')] }),
    createProject: vi.fn().mockResolvedValue(createProject('project-2')),
    updateProject: vi.fn().mockResolvedValue({ ...createProject('project-1'), description: 'updated' }),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    listPlans: vi.fn().mockResolvedValue([createPlan('plan-1')]),
    getPlan: vi.fn().mockResolvedValue(createPlan('plan-1')),
    createPlan: vi.fn().mockResolvedValue(createPlan('plan-2')),
    updatePlan: vi.fn().mockResolvedValue({ ...createPlan('plan-1'), name: 'Updated plan' }),
    deletePlan: vi.fn().mockResolvedValue(undefined),
    runPlan: vi.fn().mockResolvedValue(createSession('session-3', PCode_Models_SessionType.CHAT)),
    startPlan: vi.fn().mockResolvedValue({ planId: 'plan-1' }),
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
    listLocalSkills: vi.fn().mockResolvedValue(createLocalSkillInventory()),
    uninstallLocalSkill: vi.fn().mockResolvedValue(createUninstallResult('demo-skill')),
    setBuiltInSkillAvailability: vi.fn().mockResolvedValue(createBuiltInAvailabilityResult('hagi', true)),
    searchSkillGallery: vi.fn().mockResolvedValue(createSkillGallery()),
    getSkillGalleryDetail: vi.fn().mockResolvedValue(createSkillGalleryDetail()),
    installGallerySkill: vi.fn().mockResolvedValue(createSkillInstallResult()),
    listTrustedSkillProviders: vi.fn().mockResolvedValue(createTrustedProviderList()),
    upsertTrustedSkillProvider: vi.fn().mockResolvedValue(createTrustedProviderList()),
    deleteTrustedSkillProvider: vi.fn().mockResolvedValue(createTrustedProviderList()),
    resetTrustedSkillProviders: vi.fn().mockResolvedValue(createTrustedProviderList()),
    getMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument()),
    saveMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument()),
    initializeMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument({ repositories: [] })),
    reloadMonoSpecsManagement: vi.fn().mockResolvedValue(createMonoSpecsDocument()),
    validateMonoSpecs: vi.fn().mockResolvedValue({ isValid: true, config: null, warnings: [], errors: [] }),
    cloneMonoSpecsRepositories: vi.fn().mockResolvedValue({
      results: [{ path: 'repos/web', status: 'cloned', message: 'Cloned.' }],
    }),
    removeMonoSpecsRepositoryCheckout: vi.fn().mockResolvedValue({
      path: 'repos/web',
      removed: true,
      message: 'Removed.',
    }),
    ...apiOverrides,
  };

  const dependencies: AppDependencies = {
    api,
    env: { HAGI_API_BASE_URL: TEST_BASE_URL },
    io,
  };

  return {
    dependencies,
    api,
    stdout,
    stderr,
  };
}

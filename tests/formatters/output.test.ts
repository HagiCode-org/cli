import { describe, expect, it } from 'vitest';
import { formatJson } from '../../src/formatters/json';
import {
  formatProjectListHuman,
  formatProjectListPayload,
  formatProjectSummaryHuman,
  toProjectView,
} from '../../src/formatters/project';
import {
  formatSessionListHuman,
  formatSessionSummaryHuman,
  toSessionListPayload,
  toSessionView,
} from '../../src/formatters/session';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';

const sampleSession = {
  sessionId: { value: 'session-1' },
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

const sampleProject = {
  id: 'project-1',
  name: 'Project',
  path: '/tmp/project',
  description: 'desc',
  isMonoSpecs: false,
  monoSpecsVersion: null,
  monoSpecsRepoDirectory: null,
  monoSpecsCommitWhenArchive: null,
  hasError: false,
  error: null,
};

describe('shared formatters', () => {
  it('accepts string identifiers from live session responses', () => {
    const payload = toSessionListPayload({
      sessions: [
        {
          ...sampleSession,
          sessionId: 'session-string-1',
          projectId: 'project-string-1',
        } as typeof sampleSession,
      ],
    });

    expect(payload.sessions[0]).toMatchObject({
      sessionId: 'session-string-1',
      projectId: 'project-string-1',
    });
  });

  it('formats deterministic json payloads from normalized session data', () => {
    const payload = toSessionListPayload({
      sessions: [sampleSession],
    });

    expect(payload).toEqual({
      sessions: [
        {
          sessionId: 'session-1',
          title: 'CLI proposal management',
          type: 'Proposal',
          status: 'Drafting',
          projectId: 'project-1',
          proposalName: undefined,
          archived: false,
          lastActiveAt: '2026-03-30T00:00:00Z',
          enableIndependentWorkspace: true,
          baseBranch: 'main',
          metadata: undefined,
          chatExecutorType: undefined,
        },
      ],
    });

    expect(formatJson(payload)).toContain('"sessionId": "session-1"');
  });

  it('renders readable human output for session lists and summaries', () => {
    const view = toSessionView(sampleSession);

    expect(formatSessionListHuman('Proposal sessions', [view])).toContain('Proposal sessions (1)');
    expect(formatSessionListHuman('Proposal sessions', [view])).toContain('CLI proposal management');
    expect(formatSessionSummaryHuman(view, [['next', 'hagi proposal generate-name --session-id session-1']]))
      .toContain('next');
  });

  it('formats project payloads and summaries consistently', () => {
    const payload = formatProjectListPayload([sampleProject]);
    const view = toProjectView(sampleProject);

    expect(payload.projects[0]).toEqual({
      id: 'project-1',
      name: 'Project',
      path: '/tmp/project',
      description: 'desc',
      isMonoSpecs: false,
      monoSpecsVersion: undefined,
      monoSpecsRepoDirectory: undefined,
      monoSpecsCommitWhenArchive: undefined,
      hasError: false,
      error: undefined,
    });

    expect(formatProjectListHuman(payload.projects)).toContain('Projects (1)');
    expect(formatProjectSummaryHuman(view)).toContain('project-1');
  });
});

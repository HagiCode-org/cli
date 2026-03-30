import { describe, expect, it } from 'vitest';
import { formatJson } from '../../src/formatters/json';
import {
  formatProposalSessionListHuman,
  formatProposalSessionSummaryHuman,
  toProposalSessionListPayload,
  toProposalSessionView,
} from '../../src/formatters/proposal';
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

describe('proposal formatters', () => {
  it('formats deterministic json payloads from normalized session data', () => {
    const payload = toProposalSessionListPayload({
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
        },
      ],
    });

    expect(formatJson(payload)).toContain('"sessionId": "session-1"');
  });

  it('renders readable human output for session lists and summaries', () => {
    const view = toProposalSessionView(sampleSession);

    expect(formatProposalSessionListHuman([view])).toContain('Proposal sessions (1)');
    expect(formatProposalSessionListHuman([view])).toContain('CLI proposal management');
    expect(formatProposalSessionSummaryHuman(view, [['next', 'hagi proposal generate-name --session-id session-1']]))
      .toContain('next');
  });
});

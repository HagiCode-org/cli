import { describe, expect, it } from 'vitest';
import { formatJson } from '../../src/formatters/json';
import {
  formatProjectListHuman,
  formatProjectListPayload,
  formatProjectRepositoriesHuman,
  formatProjectSummaryHuman,
  toProjectRepositoriesPayload,
  toProjectView,
} from '../../src/formatters/project';
import {
  formatSessionListHuman,
  formatSessionSummaryHuman,
  toSessionListPayload,
  toSessionView,
} from '../../src/formatters/session';
import {
  formatPlanDeleteHuman,
  formatPlanDeletePayload,
  formatPlanListHuman,
  formatPlanListPayload,
  formatPlanRunAcceptedHuman,
  formatPlanRunAcceptedPayload,
  formatPlanSummaryHuman,
  summarizePlanSchedule,
  toPlanView,
} from '../../src/formatters/plan';
import {
  formatBuiltInAvailabilityResultHuman,
  formatLocalSkillsHuman,
} from '../../src/formatters/skills';
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
    expect(formatSessionSummaryHuman(view, [['next', 'hagi proposal optimize-description --session-id session-1']]))
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

  it('formats the repositories view and passes each path through unchanged', () => {
    const payload = toProjectRepositoriesPayload({
      ...sampleProject,
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
        { name: 'docs', path: 'repos/docs', isValidGitRepo: false },
      ],
    });

    expect(payload).toEqual({
      projectId: 'project-1',
      name: 'Project',
      isMonoSpecs: true,
      hasError: false,
      error: undefined,
      repositories: [
        {
          name: 'cli',
          path: 'repos/cli',
          displayName: 'CLI',
          type: 'library',
          branch: 'main',
          isValidGitRepo: true,
        },
        {
          name: 'docs',
          path: 'repos/docs',
          displayName: undefined,
          type: undefined,
          branch: undefined,
          isValidGitRepo: false,
        },
      ],
    });

    const human = formatProjectRepositoriesHuman(payload);
    expect(human).toContain('Name');
    expect(human).toContain('Display name');
    expect(human).toContain('repos/cli');
    expect(human).toContain('repos/docs');
    expect(formatJson(payload)).toContain('"path": "repos/cli"');
  });

  it('says a repositories view with no entries lists none and shows the project error', () => {
    const empty = toProjectRepositoriesPayload(sampleProject);
    expect(formatProjectRepositoriesHuman(empty)).toContain('This project lists no repositories.');

    const failed = toProjectRepositoriesPayload({ ...sampleProject, hasError: true, error: 'Scan failed' });
    expect(formatProjectRepositoriesHuman(failed)).toContain('Scan failed');
  });
});

describe('plan formatters', () => {
  const dailyPlan = {
    id: 'plan-daily',
    type: 'hagitask',
    name: 'Nightly review',
    enabled: true,
    createdAt: '2026-04-01T00:00:00Z',
    updatedAt: '2026-04-02T00:00:00Z',
    schedule: {
      mode: 'recurring',
      timeZone: 'Asia/Shanghai',
      startDate: '2026-04-01',
      endDate: null,
      timeOfDay: '02:00',
      repeat: { rule: 'daily', weekdays: null },
    },
    agentPool: { strategy: 'random', agents: [{ heroId: 'hero-1' }] },
    payload: { title: 'Nightly review', message: 'Review the day' },
    state: 'scheduled',
    nextRunAt: '2026-05-01T18:00:00Z',
  };

  it('summarizes once, daily and weekly schedules', () => {
    expect(summarizePlanSchedule({ mode: 'once', runAt: '2026-05-04T01:00:00Z' })).toBe('once 2026-05-04T01:00:00Z');
    expect(summarizePlanSchedule(dailyPlan.schedule)).toBe('daily 02:00 Asia/Shanghai');
    expect(
      summarizePlanSchedule({
        mode: 'recurring',
        timeZone: 'UTC',
        timeOfDay: '09:00',
        repeat: { rule: 'weekly', weekdays: ['monday', 'friday'] },
      }),
    ).toBe('weekly mon,fri 09:00 UTC');
    expect(summarizePlanSchedule(undefined)).toBe('');
  });

  it('renders the list table with schedule summaries and completed plans as a dash', () => {
    const completed = { ...dailyPlan, id: 'plan-once', enabled: false, state: 'completed', nextRunAt: null, schedule: { mode: 'once', runAt: '2026-04-20T00:00:00Z' } };
    const output = formatPlanListHuman(formatPlanListPayload([dailyPlan, completed]).plans);

    expect(output).toContain('Plans (2)');
    expect(output).toContain('plan-daily');
    expect(output).toContain('daily 02:00 Asia/Shanghai');
    expect(output).toMatch(/plan-once\s+hagitask\s+Nightly review\s+no\s+completed\s+-\s+once 2026-04-20T00:00:00Z/);
  });

  it('renders an explicit message for an empty plan list', () => {
    expect(formatPlanListHuman([])).toBe('No scheduled plans found.\n');
  });

  it('shows enabled state and next run in the single-plan summary', () => {
    const output = formatPlanSummaryHuman(toPlanView({ ...dailyPlan, enabled: false }));

    expect(output).toMatch(/^enabled\s+no$/m);
    expect(output).toMatch(/^nextRun\s+2026-05-01T18:00:00Z$/m);
    expect(output).toMatch(/^schedule\s+daily 02:00 Asia\/Shanghai$/m);
  });

  it('keeps schedule, agentPool and payload unchanged in the json view', () => {
    const [plan] = formatPlanListPayload([dailyPlan]).plans;

    expect(plan).toEqual({
      id: 'plan-daily',
      type: 'hagitask',
      name: 'Nightly review',
      enabled: true,
      state: 'scheduled',
      nextRunAt: '2026-05-01T18:00:00Z',
      schedule: dailyPlan.schedule,
      agentPool: dailyPlan.agentPool,
      payload: dailyPlan.payload,
    });
  });

  it('formats delete and background-run payloads for human and json output', () => {
    expect(formatJson(formatPlanDeletePayload('plan-daily'))).toBe(
      '{\n  "planId": "plan-daily",\n  "deleted": true\n}\n',
    );
    expect(formatPlanDeleteHuman(formatPlanDeletePayload('plan-daily'))).toContain('Plan deleted');

    const accepted = formatPlanRunAcceptedPayload({ planId: 'plan-daily' });
    expect(accepted).toEqual({ planId: 'plan-daily', accepted: true });
    expect(formatPlanRunAcceptedHuman(accepted)).toMatch(/^accepted\s+true$/m);
  });
});

describe('skills local formatters', () => {
  const builtInEnabled = {
    id: 'builtin:hagi',
    name: 'hagi',
    origin: 'built-in',
    builtIn: { enabled: true, version: '1.4.0', source: 'built-in', repository: 'hagicode', ref: null, path: null, contentHash: null },
    scope: 'global',
    agents: ['claude-code'],
    path: '/home/user/.hagi/skills/hagi',
  };
  const builtInDisabled = {
    id: 'builtin:office',
    name: 'office',
    origin: 'built-in',
    builtIn: { enabled: false, version: null, source: 'built-in', repository: 'hagicode', ref: null, path: null, contentHash: null },
    scope: 'global',
    agents: [],
    path: '/home/user/.hagi/skills/office',
  };
  const userWithMetadata = {
    id: 'demo-skill',
    name: 'demo-skill',
    origin: 'user',
    scope: 'global',
    agents: ['codex'],
    path: '/home/user/.agents/skills/demo-skill',
    managedInstallMetadata: { version: '1.2.0' },
  };
  const legacyWithoutOrigin = {
    id: 'legacy-skill',
    name: 'legacy-skill',
    scope: 'global',
    agents: [],
    path: '/home/user/.agents/skills/legacy-skill',
  };

  function cellsFor(output: string, name: string): string[] {
    const row = output.split('\n').find(line => line.startsWith(`${name} `));
    return row?.split(/\s{2,}/) ?? [];
  }

  it('shows origin, enabled state and version for built-in and user rows', () => {
    const output = formatLocalSkillsHuman({
      generatedAtUtc: '2026-10-16T00:00:00Z',
      items: [builtInEnabled, builtInDisabled, userWithMetadata, legacyWithoutOrigin],
    } as never);

    expect(output.split('\n')[1]).toMatch(/^Name\s+Origin\s+Enabled\s+Version\s+Scope\s+Agents\s+Path$/);
    expect(cellsFor(output, 'hagi')).toEqual(['hagi', 'built-in', 'yes', '1.4.0', 'global', 'claude-code', '/home/user/.hagi/skills/hagi']);
    expect(cellsFor(output, 'office')).toEqual(['office', 'built-in', 'no', '-', 'global', '-', '/home/user/.hagi/skills/office']);
    expect(cellsFor(output, 'demo-skill')).toEqual(['demo-skill', 'user', '-', '1.2.0', 'global', 'codex', '/home/user/.agents/skills/demo-skill']);
  });

  it('treats a row with no origin as a user skill without an enabled state or version', () => {
    const output = formatLocalSkillsHuman({ generatedAtUtc: '2026-10-16T00:00:00Z', items: [legacyWithoutOrigin] } as never);

    expect(cellsFor(output, 'legacy-skill')).toEqual(['legacy-skill', 'user', '-', '-', 'global', '-', '/home/user/.agents/skills/legacy-skill']);
  });

  it('formats a successful and a failed availability result', () => {
    const succeeded = formatBuiltInAvailabilityResultHuman({
      slug: 'hagi',
      enabled: true,
      succeeded: true,
      userMessage: 'Built-in skill hagi is now enabled.',
      diagnosticMessage: null,
    } as never);
    expect(succeeded).toMatch(/^skillName\s+hagi$/m);
    expect(succeeded).toMatch(/^enabled\s+yes$/m);
    expect(succeeded).toContain('Built-in skill hagi is now enabled.');
    expect(succeeded).not.toContain('diagnostic');

    const failed = formatBuiltInAvailabilityResultHuman({
      slug: 'nope',
      enabled: false,
      succeeded: false,
      userMessage: 'Unknown built-in skill: nope.',
      diagnosticMessage: 'No built-in skill matches the slug.',
    } as never);
    expect(failed).toMatch(/^enabled\s+no$/m);
    expect(failed).toContain('Unknown built-in skill: nope.');
    expect(failed).toMatch(/^diagnostic\s+No built-in skill matches the slug\.$/m);
  });
});

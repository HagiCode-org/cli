import { mkdtempSync, writeFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fromJson, toJson, type JsonValue, type Message } from '@bufbuild/protobuf';
import type { DescMessage, DescService } from '@bufbuild/protobuf';
import type { Interceptor } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PresetTasksService } from '../../src/generated/grpc/hagicode/community/v1/preset_tasks_pb';
import { ScheduledPlansService } from '../../src/generated/grpc/hagicode/community/v1/scheduled_plans_pb';
import { SkillGalleryService } from '../../src/generated/grpc/hagicode/community/v1/skill_gallery_pb';
import { StatisticsService } from '../../src/generated/grpc/hagicode/platform/v1/statistics_pb';
import { ProjectService } from '../../src/generated/grpc/hagicode/project/v1/project_pb';
import { VaultService } from '../../src/generated/grpc/hagicode/project/v1/vault_pb';
import { SessionMessagingService } from '../../src/generated/grpc/hagicode/session/v1/session_messaging_pb';
import { SessionProposalService } from '../../src/generated/grpc/hagicode/session/v1/session_proposal_pb';
import { SessionsService } from '../../src/generated/grpc/hagicode/session/v1/sessions_pb';
import { runCli } from '../../src/main';
import { configureApiRuntime } from '../../src/runtime/apiRuntime';
import { createDefaultDependencies, type CliIo } from '../../src/runtime/commandContext';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';

/**
 * Request-path checks: every command runs through the real gRPC-Web client against a local recording server. Each case
 * asserts the exact RPC (service and method) and the request message that reached the wire. Lifecycle commands must
 * produce exactly one backend call.
 */

type Recorded = {
  /** `<Service>/<Method>`, for example `SessionsService/ListSessions`. */
  rpc: string;
  /** The request message as protobuf JSON, with default values written out. */
  request: any;
};

const VAULT_LIST_FIXTURE = {
  generatedAtUtc: '2026-10-16T00:00:00Z',
  items: [
    {
      id: 'vault-1',
      name: 'Main Vault',
      type: 'folder',
      physicalPath: '/vaults/main',
      gitUrl: null,
      createdAtUtc: '2026-04-01T00:00:00Z',
      updatedAtUtc: '2026-04-02T00:00:00Z',
      bootstrapDiagnostics: [],
    },
  ],
};

const SESSION_FIXTURE = {
  sessionId: 's-1',
  title: 'Session',
  description: 'desc',
  type: 'Proposal',
  status: 'Drafting',
  isActive: true,
  lastActiveAt: '2026-03-30T00:00:00Z',
  projectId: 'p-1',
  projectName: 'Project',
  projectPath: '/tmp/project',
  isMonoSpecs: false,
  pendingMessageCount: 0,
  metadata: null,
};

let server: Server;
let baseUrl: string;
let recorded: Recorded[];
let tempDir: string;

// Answers by RPC method name; every other RPC answers an empty response message.
const RESPONSES: Record<string, unknown> = {
  ListVaults: { result: VAULT_LIST_FIXTURE },
  ListPresetTaskSchemas: { result: [] },
  GetSession: { result: SESSION_FIXTURE },
  GetSkillGalleryAudit: {
    result: {
      id: 'react-best-practices',
      source: 'vercel/skills',
      skillSlug: 'react-best-practices',
      providers: [{ provider: 'ath', risk: 'low', alerts: 0, score: 92, analyzedAt: '2026-10-30T08:00:00Z' }],
    },
  },
};

const SERVICES: DescService[] = [
  SessionsService,
  SessionMessagingService,
  SessionProposalService,
  ProjectService,
  VaultService,
  ScheduledPlansService,
  PresetTasksService,
  SkillGalleryService,
  StatisticsService,
];

const recordRequests: Interceptor = next => async request => {
  recorded.push({
    rpc: `${request.service.name}/${request.method.name}`,
    request: toJson(request.method.input as DescMessage, request.message as Message, { alwaysEmitImplicit: true }),
  });
  return next(request);
};

beforeAll(async () => {
  const handler = connectNodeAdapter({
    requestPathPrefix: '/grpc',
    interceptors: [recordRequests],
    routes: router => {
      for (const service of SERVICES) {
        const implementation: Record<string, () => Message> = {};
        for (const method of service.methods) {
          implementation[method.localName] = () =>
            fromJson(method.output, (RESPONSES[method.name] ?? {}) as JsonValue, { ignoreUnknownFields: true });
        }
        router.service(service, implementation as never);
      }
    },
  });
  server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

beforeEach(() => {
  recorded = [];
  tempDir = mkdtempSync(join(tmpdir(), 'hagi-request-paths-'));
});

async function run(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
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

  const exitCode = await runCli(
    ['node', 'hagi', '--base-url', baseUrl, ...args],
    createDefaultDependencies({ XDG_CONFIG_HOME: tempDir }, io),
  );
  return { exitCode, stdout: stdout.join(''), stderr: stderr.join('') };
}

const rpcName = (call: Recorded): string => call.rpc.replace(/^hagicode\.[a-z]+\.v1\./, '');

describe('request paths for chat, proposal, hagitask, and vault commands', () => {
  // Chat (4.1)
  it('chat list requests the chat session collection', async () => {
    await run(['chat', 'list']);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/ListSessions']);
    expect(recorded[0].request).toMatchObject({ type: 'Chat' });
  });

  it('chat create posts the chat session body', async () => {
    await run(['chat', 'create', '--title', 'Chat', '--project-id', 'p-1']);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/OpenChatSession']);
    expect(recorded[0].request.body).toMatchObject({ title: 'Chat', projectId: 'p-1' });
  });

  it('chat archive uses the dedicated archive-chat endpoint', async () => {
    await run(['chat', 'archive', '--session-id', 's-1']);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/ArchiveChatSession']);
    expect(recorded[0].request).toMatchObject({ sessionId: 's-1' });
  });

  it('chat delete removes the session by id', async () => {
    await run(['chat', 'delete', '--session-id', 's-1']);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/DeleteSession']);
    expect(recorded[0].request).toMatchObject({ sessionId: 's-1', deleteFiles: false });
  });

  it('chat send posts the message to the session messages endpoint', async () => {
    await run(['chat', 'send', '--session-id', 's-1', '--content', 'hello']);
    expect(recorded.map(rpcName)).toEqual(['SessionMessagingService/PostSessionMessage']);
    expect(recorded[0].request.body).toMatchObject({ content: 'hello' });
  });

  // Proposal list and create (4.2)
  it('proposal list requests the proposal session collection', async () => {
    await run(['proposal', 'list']);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/ListSessions']);
    expect(recorded[0].request).toMatchObject({ type: 'Proposal' });
  });

  it('proposal create posts a proposal session only', async () => {
    await run([
      'proposal', 'create',
      '--project-id', 'p-1',
      '--chief-complaint', 'Fix login',
      '--title', 'Login fix',
    ]);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/OpenSession']);
  });

  // Explicit lifecycle commands (4.3): exactly one request each
  it('proposal generate issues exactly one generate-proposal request', async () => {
    await run(['proposal', 'generate', '--session-id', 's-1', '--proposal-content-language', 'en-US']);
    expect(recorded.map(rpcName)).toEqual(['SessionProposalService/GenerateProposal']);
    expect(recorded[0].request.body).toMatchObject({ proposalContentLanguage: 'en-US' });
  });

  it('proposal execute issues exactly one execute-proposal request', async () => {
    await run(['proposal', 'execute', '--session-id', 's-1']);
    expect(recorded.map(rpcName)).toEqual(['SessionProposalService/ExecuteProposal']);
  });

  it('proposal annotate issues exactly one annotations request', async () => {
    const inputPath = join(tempDir, 'annotations.json');
    writeFileSync(inputPath, JSON.stringify({ files: [{ fileName: 'proposal.md', filePath: 'proposal.md' }] }));

    await run(['proposal', 'annotate', '--session-id', 's-1', '--input', inputPath]);
    expect(recorded.map(rpcName)).toEqual(['SessionMessagingService/SubmitSessionAnnotations']);
  });

  it('proposal archive issues exactly one archive request', async () => {
    await run(['proposal', 'archive', '--session-id', 's-1']);
    expect(recorded.map(rpcName)).toEqual(['SessionProposalService/ArchiveSession']);
  });

  it('proposal complete issues exactly one complete request (archive and transition step)', async () => {
    await run(['proposal', 'complete', '--session-id', 's-1']);
    expect(recorded.map(rpcName)).toEqual(['SessionProposalService/CompleteSession']);
  });

  it('proposal send issues exactly one messages request', async () => {
    await run(['proposal', 'send', '--session-id', 's-1', '--content', 'continue']);
    expect(recorded.map(rpcName)).toEqual(['SessionMessagingService/PostSessionMessage']);
  });

  it('proposal optimize-description issues exactly one optimize-proposal request with the description', async () => {
    await run([
      'proposal', 'optimize-description',
      '--session-id', 's-1',
      '--description', 'Refine this',
      '--default-title',
    ]);
    expect(recorded.map(rpcName)).toEqual(['SessionProposalService/OptimizeSessionProposal']);
    expect(recorded[0].request.body).toMatchObject({ description: 'Refine this', isDefaultTitle: true });
  });

  it('proposal status reads the session before writing the merged update', async () => {
    await run(['proposal', 'status', '--session-id', 's-1', '--status', 'Completed']);
    expect(recorded.map(rpcName)).toEqual(['SessionsService/GetSession', 'SessionsService/SaveSession']);
  });

  // HagiTask (4.1 - 4.4)
  it('hagitask create by task forwards the preset task id, locale, input and routing fields', async () => {
    const inputPath = join(tempDir, 'input.json');
    writeFileSync(inputPath, JSON.stringify({ inputs: { commitScope: 'cli' } }), 'utf8');

    await run([
      'hagitask', 'create',
      '--title', 'Auto',
      '--project-id', 'p-1',
      '--task-id', 'compose-commit',
      '--input', inputPath,
      '--locale', 'en-US',
      '--message', 'Do it',
      '--repository-path', 'repos/app',
      '--target-type', 'repository',
      '--vault-id', 'vault-1',
      '--need-push',
      '--pull-rebase',
      '--target-branch-mode', 'new-custom',
      '--target-branch-name', 'feature/cli',
      '--script-key', 'hagitask.auto-compose-commit',
      '--hero-id', 'hero-1',
      '--hero-selection-mode', 'random',
    ]);

    expect(recorded.map(rpcName)).toEqual(['SessionsService/StartHagiTaskSession']);
    expect(recorded[0].request.body).toMatchObject({
      title: 'Auto',
      projectId: 'p-1',
      presetTaskId: 'compose-commit',
      presetTaskLocale: 'en-US',
      presetTaskInput: { inputs: { commitScope: 'cli' } },
      message: 'Do it',
      repositoryPath: 'repos/app',
      targetType: 'repository',
      vaultId: 'vault-1',
      needPush: true,
      pullRebaseBeforePush: true,
      targetBranchMode: 'new-custom',
      targetBranchName: 'feature/cli',
      scriptKey: 'hagitask.auto-compose-commit',
      heroId: 'hero-1',
      heroSelectionMode: 'random',
    });
  });

  it('hagitask create by prompt posts the prompt id without a preset task id', async () => {
    await run(['hagitask', 'create', '--title', 'Auto', '--project-id', 'p-1', '--prompt-id', 'auto-compose-commit.en-US']);

    expect(recorded.map(rpcName)).toEqual(['SessionsService/StartHagiTaskSession']);
    expect(recorded[0].request.body).toMatchObject({
      title: 'Auto',
      projectId: 'p-1',
      promptId: 'auto-compose-commit.en-US',
    });
  });

  it('hagitask list requests the schema summary collection', async () => {
    await run(['hagitask', 'list']);
    expect(recorded.map(rpcName)).toEqual(['PresetTasksService/ListPresetTaskSchemas']);
  });

  it('hagitask schema requests the schema of the given task id', async () => {
    await run(['hagitask', 'schema', '--task-id', 'compose-commit']);
    expect(recorded.map(rpcName)).toEqual(['PresetTasksService/GetPresetTaskSchema']);
    expect(recorded[0].request).toMatchObject({ presetTaskId: 'compose-commit' });
  });

  it('hagitask send targets the given session id messages endpoint', async () => {
    await run(['hagitask', 'send', '--session-id', 'hagitask-9', '--content', 'continue']);
    expect(recorded.map(rpcName)).toEqual(['SessionMessagingService/PostSessionMessage']);
    expect(recorded[0].request).toMatchObject({ sessionId: 'hagitask-9' });
  });

  // Vault (6.1 - 6.4)
  it('vault list requests the vault collection', async () => {
    await run(['vault', 'list']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/ListVaults']);
  });

  it('vault create posts the vault body', async () => {
    await run(['vault', 'create', '--name', 'Notes', '--type', 'folder', '--physical-path', '/vaults/notes']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/CreateVault']);
    expect(recorded[0].request.body).toMatchObject({ name: 'Notes', type: 'folder', physicalPath: '/vaults/notes' });
  });

  it('vault update reads the current vault first and keeps omitted fields', async () => {
    await run(['vault', 'update', '--id', 'vault-1', '--name', 'Renamed']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/ListVaults', 'VaultService/UpdateVault']);
    expect(recorded[1].request.body).toMatchObject({ name: 'Renamed', physicalPath: '/vaults/main' });
  });

  it('vault delete sends deleteLocalFiles=true when requested', async () => {
    await run(['vault', 'delete', '--id', 'vault-1', '--delete-local-files']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/DeleteVault']);
    expect(recorded[0].request).toMatchObject({ id: 'vault-1', deleteLocalFiles: true });
  });

  it('vault delete does not request local file cleanup by default', async () => {
    await run(['vault', 'delete', '--id', 'vault-1']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/DeleteVault']);
    expect(recorded[0].request).toMatchObject({ id: 'vault-1', deleteLocalFiles: false });
  });

  it('vault files list browses the vault path', async () => {
    await run(['vault', 'files', 'list', '--id', 'vault-1', '--path', 'docs']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/GetVaultFiles']);
    expect(recorded[0].request).toMatchObject({ id: 'vault-1', path: 'docs' });
  });

  it('vault files preview requests the file content endpoint', async () => {
    await run(['vault', 'files', 'preview', '--id', 'vault-1', '--path', 'docs/a.md']);
    expect(recorded.map(rpcName)).toEqual(['VaultService/GetVaultFilePreview']);
    expect(recorded[0].request).toMatchObject({ id: 'vault-1', path: 'docs/a.md' });
  });
});

describe('request paths for skills commands', () => {
  it('skills local list requests the local inventory', async () => {
    await run(['skills', 'local', 'list']);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/GetLocalSkills']);
  });

  it('skills local uninstall posts the skill name', async () => {
    await run(['skills', 'local', 'uninstall', '--skill-name', 'demo-skill']);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/UninstallLocalSkill']);
    expect(recorded[0].request.body).toMatchObject({ skillName: 'demo-skill' });
  });

  it('skills gallery search sends the keyword as a query parameter', async () => {
    await run(['skills', 'gallery', 'search', '--query', 'react']);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/GetSkillGallery']);
    expect(recorded[0].request).toMatchObject({ query: 'react' });
  });

  it('skills gallery detail sends the id and source to the detail and audit RPCs', async () => {
    const { stdout } = await run(['skills', 'gallery', 'detail', '--id', 'react-best-practices', '--source', 'vercel/skills', '--json']);
    // The two calls start together, so their order on the wire is not fixed; compare them as a set.
    expect(recorded.map(rpcName).sort()).toEqual([
      'SkillGalleryService/GetSkillGalleryAudit',
      'SkillGalleryService/GetSkillGalleryDetail',
    ]);
    const audit = recorded.find(call => rpcName(call) === 'SkillGalleryService/GetSkillGalleryAudit');
    expect(audit?.request).toMatchObject({ id: 'react-best-practices', source: 'vercel/skills' });
    expect(JSON.parse(stdout).audit).toEqual({
      providers: [{ provider: 'ath', risk: 'low', alerts: 0, score: 92, analyzedAt: '2026-10-30T08:00:00Z' }],
    });
  });

  it('skills gallery install posts the install body with the version token', async () => {
    await run([
      'skills', 'gallery', 'install',
      '--id', 'react-best-practices',
      '--source', 'vercel/skills',
      '--skill-slug', 'react-best-practices',
      '--version', '1.2.0',
    ]);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/InstallSkill']);
    expect(recorded[0].request.body).toMatchObject({
      id: 'react-best-practices',
      source: 'vercel/skills',
      skillSlug: 'react-best-practices',
      version: '1.2.0',
    });
  });

  it('skills trusted list requests the provider directory', async () => {
    await run(['skills', 'trusted', 'list']);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/GetTrustedSkillProviders']);
  });

  it('skills trusted upsert posts the provider document', async () => {
    const inputPath = join(tempDir, 'provider.json');
    writeFileSync(inputPath, JSON.stringify({ providerId: 'acme', displayName: 'Acme', isEnabled: true, sortOrder: 2 }));

    await run(['skills', 'trusted', 'upsert', '--input', inputPath]);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/UpsertTrustedSkillProvider']);
    expect(recorded[0].request.body).toMatchObject({ providerId: 'acme', displayName: 'Acme', isEnabled: true, sortOrder: 2 });
  });

  it('skills trusted delete sends the provider id in the request body', async () => {
    await run(['skills', 'trusted', 'delete', '--provider-id', 'vercel']);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/DeleteTrustedSkillProvider']);
    expect(recorded[0].request.body).toMatchObject({ providerId: 'vercel' });
  });

  it('skills trusted reset posts to the reset endpoint', async () => {
    await run(['skills', 'trusted', 'reset']);
    expect(recorded.map(rpcName)).toEqual(['SkillGalleryService/ResetTrustedSkillProviders']);
  });
});

// Scheduled plan facade methods (1.2): the plan commands are not wired yet, so each method is called directly.
describe('request paths for scheduled plan facade methods', () => {
  const PLAN_SAVE_BODY = { type: 'hagitask', name: 'Nightly review', enabled: true };

  beforeEach(() => {
    configureApiRuntime({ baseUrl });
  });

  it('listPlans requests the plan collection', async () => {
    await createGrpcHagiApi().listPlans();
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/ListScheduledPlans']);
  });

  it('getPlan requests the plan by id', async () => {
    await createGrpcHagiApi().getPlan('plan-1');
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/GetScheduledPlan']);
    expect(recorded[0].request).toMatchObject({ id: 'plan-1' });
  });

  it('createPlan posts the save body to the plan collection', async () => {
    await createGrpcHagiApi().createPlan(PLAN_SAVE_BODY);
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/CreateScheduledPlan']);
    expect(recorded[0].request.body).toMatchObject(PLAN_SAVE_BODY);
  });

  it('updatePlan puts the save body to the plan by id', async () => {
    await createGrpcHagiApi().updatePlan('plan-1', PLAN_SAVE_BODY);
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/UpdateScheduledPlan']);
    expect(recorded[0].request).toMatchObject({ id: 'plan-1' });
    expect(recorded[0].request.body).toMatchObject(PLAN_SAVE_BODY);
  });

  it('deletePlan deletes the plan by id', async () => {
    await createGrpcHagiApi().deletePlan('plan-1');
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/DeleteScheduledPlan']);
    expect(recorded[0].request).toMatchObject({ id: 'plan-1' });
  });

  it('runPlan posts to the run endpoint', async () => {
    await createGrpcHagiApi().runPlan('plan-1');
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/RunScheduledPlan']);
    expect(recorded[0].request).toMatchObject({ id: 'plan-1' });
  });

  it('startPlan posts to the start endpoint', async () => {
    await createGrpcHagiApi().startPlan('plan-1');
    expect(recorded.map(rpcName)).toEqual(['ScheduledPlansService/StartScheduledPlan']);
    expect(recorded[0].request).toMatchObject({ id: 'plan-1' });
  });
});

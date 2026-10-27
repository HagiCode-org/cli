import { mkdtemp, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fromJson, type JsonValue } from '@bufbuild/protobuf';
import type { HandlerContext } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionsService } from '../../src/generated/grpc/hagicode/session/v1/sessions_pb';
import { runCli } from '../../src/main';
import { createDefaultDependencies, type CliIo } from '../../src/runtime/commandContext';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createProposalOptimizationBundle } from './testHelpers';
import { createApiError, createDependencies, createSession, TEST_BASE_URL } from './testHelpers';

const CLI_VERSION = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8')).version;

type StubBackend = { url: string; calls: Array<{ rpc: string; client: string | null }>; server: Server };
const runningBackends: Server[] = [];

/** A gRPC-Web endpoint under /grpc that answers OpenSession and ListSessions with `session`, and records each call. */
async function stubBackend(session: Record<string, unknown>): Promise<StubBackend> {
  const calls: StubBackend['calls'] = [];
  const answer = (rpc: string, context: HandlerContext, response: JsonValue, schemaOf: 'open' | 'list') => {
    calls.push({ rpc, client: context.requestHeader.get('x-hagi-client') });
    const method = SessionsService.methods.find(candidate => candidate.name === (schemaOf === 'open' ? 'OpenSession' : 'ListSessions'))!;
    return fromJson(method.output, response, { ignoreUnknownFields: true });
  };
  const handler = connectNodeAdapter({
    requestPathPrefix: '/grpc',
    routes: router => {
      router.service(SessionsService, {
        openSession: (_request: unknown, context: HandlerContext) =>
          answer('OpenSession', context, { result: session } as JsonValue, 'open'),
        listSessions: (_request: unknown, context: HandlerContext) =>
          answer('ListSessions', context, { result: { sessions: [session] } } as JsonValue, 'list'),
      } as never);
    },
  });
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  runningBackends.push(server);
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, calls, server };
}

/** The session as protobuf JSON: ids are plain strings on the wire. */
function createWireSession(sessionId: string) {
  return {
    sessionId,
    title: 'CLI proposal management',
    code: 12,
    type: 'Proposal',
    status: 'Drafting',
    isActive: true,
    projectId: 'project-1',
    projectName: 'Project',
    projectPath: '/tmp/project',
    pendingMessageCount: 0,
  };
}

function captureIo(): { io: CliIo; stdout: string[] } {
  const stdout: string[] = [];
  return {
    io: {
      stdout: value => {
        stdout.push(value);
      },
      stderr: () => undefined,
    },
    stdout,
  };
}

describe('proposal commands over the wire', () => {
  afterEach(async () => {
    for (const server of runningBackends.splice(0)) {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  const createArgs = [
    'node', 'hagi', 'proposal', 'create',
    '--project-id', 'project-1',
    '--chief-complaint', 'Add proposal CLI commands',
    '--default-title',
  ];

  it('sends X-Hagi-Client with the package version on proposal create and proposal list', async () => {
    const backend = await stubBackend(createWireSession('session-2'));
    const env = { HAGI_API_BASE_URL: backend.url };

    await expect(runCli(createArgs, createDefaultDependencies(env, captureIo().io))).resolves.toBe(0);
    await expect(
      runCli(['node', 'hagi', 'proposal', 'list', '--project-id', 'project-1'], createDefaultDependencies(env, captureIo().io)),
    ).resolves.toBe(0);

    expect(backend.calls).toEqual([
      { rpc: 'OpenSession', client: `cli/${CLI_VERSION}` },
      { rpc: 'ListSessions', client: `cli/${CLI_VERSION}` },
    ]);
  });

  it('keeps the proposal create --json output keys unchanged and free of client or achievement fields', async () => {
    const backend = await stubBackend(createWireSession('session-2'));
    const env = { HAGI_API_BASE_URL: backend.url };
    const { io, stdout } = captureIo();

    await expect(runCli([...createArgs, '--json'], createDefaultDependencies(env, io))).resolves.toBe(0);

    const output = stdout.join('');
    expect(Object.keys(JSON.parse(output))).toEqual(['session', 'nextCommand']);
    expect(output).not.toMatch(/client|achievement/i);
  });

  it('keeps the proposal create option list unchanged', async () => {
    const env = { HAGI_API_BASE_URL: TEST_BASE_URL };
    const { io, stdout } = captureIo();

    await expect(runCli(['node', 'hagi', 'proposal', 'create', '--help'], createDefaultDependencies(env, io))).resolves.toBe(0);

    const flags = [...stdout.join('').matchAll(/^ {2}(-\S.*?) {2,}/gm)].map(match => match[1]);
    expect(flags).toEqual([
      '--json',
      '--project-id <id>',
      '--chief-complaint <text>',
      '--original-chief-complaint <text>',
      '--title <title>',
      '--default-title',
      '--enable-independent-workspace',
      '--base-branch <branch>',
      '-h, --help',
    ]);
    expect(stdout.join('')).not.toMatch(/--(target|repo)/i);
  });
});

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
    expect(api.createProposalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Proposal',
        projectId: 'project-1',
        chiefComplaint: 'Add proposal CLI commands',
        type: PCode_Models_SessionType.PROPOSAL,
        isDefaultTitle: true,
      }),
    );
    expect(stdout.join('')).toContain('"nextCommand": "hagi proposal optimize-description --session-id session-2');
  });

  it('supports optimize-description, archive, complete, and send in json mode', async () => {
    const { dependencies, api, stdout } = createDependencies({
      archiveProposal: vi.fn().mockResolvedValue({
        ...createSession('session-1'),
        status: PCode_Models_SessionStatus.ARCHIVING,
      }),
      completeProposal: vi.fn().mockResolvedValue({
        ...createSession('session-1'),
        status: PCode_Models_SessionStatus.COMPLETED,
      }),
    });

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'optimize-description', '--session-id', 'session-1', '--description', 'Refine this', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.optimizeProposal).toHaveBeenCalledWith('session-1', { description: 'Refine this' });
    expect(stdout.join('')).toContain('"optimizedProposalName": "cli-proposal-management"');

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'archive', '--session-id', 'session-1', '--hero-id', 'hero-1', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.archiveProposal).toHaveBeenCalledWith('session-1', { heroId: 'hero-1' });

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'complete', '--session-id', 'session-1', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.completeProposal).toHaveBeenCalledWith('session-1');

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'send', '--session-id', 'session-1', '--content', 'continue', '--json'],
      dependencies,
    )).toBe(0);
    expect(api.sendMessage).toHaveBeenCalledWith('session-1', expect.objectContaining({ content: 'continue' }));

    expect(stdout.join('')).toContain('"optimizedProposalName": "cli-proposal-management"');
    expect(stdout.join('')).toContain('"message": "Queued"');
  });

  it('loads annotation payloads from json files and posts them to the backend', async () => {
    const { dependencies, api, stdout } = createDependencies();
    const dir = await mkdtemp(join(tmpdir(), 'hagi-cli-proposal-'));
    const inputPath = join(dir, 'annotations.json');
    await writeFile(inputPath, JSON.stringify({ files: [{ fileName: 'proposal.md', filePath: 'proposal.md' }] }));

    const exitCode = await runCli(
      ['node', 'hagi', 'proposal', 'annotate', '--session-id', 'session-1', '--input', inputPath, '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.submitAnnotations).toHaveBeenCalledWith(
      'session-1',
      expect.objectContaining({
        sessionId: 'session-1',
        totalAnnotations: 1,
        files: [{ fileName: 'proposal.md', filePath: 'proposal.md' }],
      }),
    );
    expect(stdout.join('')).toContain('"annotationCount": 1');
  });

  it('rejects malformed annotation input before transport', async () => {
    const { dependencies, api, stderr } = createDependencies();
    const dir = await mkdtemp(join(tmpdir(), 'hagi-cli-proposal-bad-'));
    const inputPath = join(dir, 'broken.json');
    await writeFile(inputPath, '{not json');

    const exitCode = await runCli(
      ['node', 'hagi', 'proposal', 'annotate', '--session-id', 'session-1', '--input', inputPath, '--json'],
      dependencies,
    );

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.submitAnnotations).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Invalid JSON input');
  });

  it('updates status through read-before-write merging', async () => {
    const { dependencies, api, stdout } = createDependencies({
      getSession: vi.fn().mockResolvedValue({
        ...createSession('session-9'),
        title: 'Current title',
        description: 'Current description',
        metadata: '{"key":"value"}',
      }),
    });

    const exitCode = await runCli(
      ['node', 'hagi', 'proposal', 'status', '--session-id', 'session-9', '--status', 'Reviewing', '--json'],
      dependencies,
    );

    expect(exitCode).toBe(0);
    expect(api.updateSession).toHaveBeenCalledWith('session-9', {
      title: 'Current title',
      description: 'Current description',
      status: PCode_Models_SessionStatus.REVIEWING,
      metadata: '{"key":"value"}',
    });
    expect(stdout.join('')).toContain('"status": "Reviewing"');
  });

  it('surfaces representative 400, 404, and 409 backend failures', async () => {
    const badRequest = createDependencies({
      createProposalSession: vi.fn().mockRejectedValue(createApiError(400, { error: 'Bad input' })),
    });
    const notFound = createDependencies({
      generateProposal: vi.fn().mockRejectedValue(createApiError(404, { error: 'Session not found' })),
    });
    const conflict = createDependencies({
      optimizeProposal: vi.fn().mockRejectedValue(
        createApiError(409, { error: 'Session is already being optimized' }),
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
        ['node', 'hagi', 'proposal', 'generate', '--session-id', 'missing-session', '--proposal-content-language', 'en-US', '--json'],
        notFound.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(notFound.stderr.join('')).toContain('"status": 404');

    await expect(
      runCli(
        ['node', 'hagi', 'proposal', 'optimize-description', '--session-id', 'session-7', '--description', 'Refine', '--json'],
        conflict.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(conflict.stderr.join('')).toContain('"status": 409');
  });

  it('sends the content language with generate and rejects unsupported languages before transport', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'generate', '--session-id', 'session-1', '--proposal-content-language', 'zh-CN'],
      dependencies,
    )).toBe(0);
    expect(api.generateProposal).toHaveBeenCalledWith('session-1', expect.objectContaining({ proposalContentLanguage: 'zh-CN' }));

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'generate', '--session-id', 'session-1', '--proposal-content-language', 'klingon'],
      dependencies,
    )).toBe(EXIT_CODES.USAGE);
    expect(api.generateProposal).toHaveBeenCalledTimes(1);
    expect(stderr.join('')).toContain('--proposal-content-language must be one of');
  });

  it('prints the applied title, proposal name, and next step after optimize-description', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'optimize-description', '--session-id', 'session-1', '--description', 'Refine this'],
      dependencies,
    )).toBe(0);

    expect(api.optimizeProposal).toHaveBeenCalledWith('session-1', { description: 'Refine this' });
    const output = stdout.join('');
    expect(output).toContain('Proposal optimized');
    expect(output).toContain('proposalName   cli-proposal-management');
    expect(output).toContain('title          Login fix');
    expect(output).toContain('valid          yes');
    expect(output).toContain('next           hagi proposal generate --session-id session-1');
  });

  it('reports validation diagnostics and omits the generate step when the bundle is invalid', async () => {
    const { dependencies, stdout } = createDependencies({
      optimizeProposal: vi.fn().mockResolvedValue(
        createProposalOptimizationBundle({
          isValid: false,
          diagnostics: [{ code: 'MISSING_SECTION', message: 'Scope section is empty' }],
        }),
      ),
    });

    expect(await runCli(
      ['node', 'hagi', 'proposal', 'optimize-description', '--session-id', 'session-1', '--description', 'Refine this'],
      dependencies,
    )).toBe(0);

    const output = stdout.join('');
    expect(output).toContain('returned diagnostics');
    expect(output).toContain('valid          no');
    expect(output).toContain('diagnostic     MISSING_SECTION: Scope section is empty');
    expect(output).not.toContain('hagi proposal generate');
  });

  it('forwards title, default-title, direction, and original complaint in the optimize request', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(
      [
        'node', 'hagi', 'proposal', 'optimize-description',
        '--session-id', 'session-1',
        '--description', 'Refine this',
        '--title', 'New Proposal',
        '--default-title',
        '--optimization-direction', 'Focus on risk',
        '--original-chief-complaint', 'Login is slow',
      ],
      dependencies,
    )).toBe(0);

    expect(api.optimizeProposal).toHaveBeenCalledWith('session-1', {
      description: 'Refine this',
      title: 'New Proposal',
      isDefaultTitle: true,
      optimizationDirection: 'Focus on risk',
      originalChiefComplaint: 'Login is slow',
    });
  });
});

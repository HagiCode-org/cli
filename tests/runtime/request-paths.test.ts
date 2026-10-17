import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/main';
import { createDefaultDependencies, type CliIo } from '../../src/runtime/commandContext';

/**
 * Request-path checks: every command runs through the real generated client against a local
 * recording server. Each case asserts the exact method, path, query, and body that reached the wire.
 * Lifecycle commands must produce exactly one backend request.
 */

type Recorded = {
  method: string;
  path: string;
  query: string;
  body: unknown;
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
  sessionId: { value: 's-1' },
  title: 'Session',
  description: 'desc',
  type: 'Proposal',
  status: 'Drafting',
  isActive: true,
  lastActiveAt: '2026-03-30T00:00:00Z',
  projectId: { value: 'p-1' },
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

function respond(method: string, path: string, response: ServerResponse): void {
  const json = (status: number, body: unknown) => {
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(body));
  };

  if (method === 'GET' && path === '/api/vaults') {
    json(200, VAULT_LIST_FIXTURE);
    return;
  }

  if (method === 'GET' && /^\/api\/Sessions\/[^/]+$/.test(path)) {
    json(200, SESSION_FIXTURE);
    return;
  }

  json(200, {});
}

beforeAll(async () => {
  server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(chunk as Buffer));
    request.on('end', () => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      const rawBody = Buffer.concat(chunks).toString('utf8');
      recorded.push({
        method: request.method ?? '',
        path: url.pathname,
        query: url.search,
        body: rawBody ? JSON.parse(rawBody) : undefined,
      });
      respond(request.method ?? '', url.pathname, response);
    });
  });

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

function requestLine(request: Recorded): string {
  return `${request.method} ${request.path}${request.query}`;
}

describe('request paths for chat, proposal, autotask, and vault commands', () => {
  // Chat (4.1)
  it('chat list requests the chat session collection', async () => {
    await run(['chat', 'list']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/Sessions?type=Chat']);
  });

  it('chat create posts the chat session body', async () => {
    await run(['chat', 'create', '--title', 'Chat', '--project-id', 'p-1']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/chat']);
    expect(recorded[0].body).toMatchObject({ title: 'Chat', projectId: 'p-1' });
  });

  it('chat archive uses the dedicated archive-chat endpoint', async () => {
    await run(['chat', 'archive', '--session-id', 's-1']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/archive-chat']);
  });

  it('chat delete removes the session by id', async () => {
    await run(['chat', 'delete', '--session-id', 's-1']);
    expect(recorded.map(requestLine)).toEqual(['DELETE /api/Sessions/s-1?deleteFiles=false']);
  });

  it('chat send posts the message to the session messages endpoint', async () => {
    await run(['chat', 'send', '--session-id', 's-1', '--content', 'hello']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/messages']);
    expect(recorded[0].body).toMatchObject({ content: 'hello' });
  });

  // Proposal list and create (4.2)
  it('proposal list requests the proposal session collection', async () => {
    await run(['proposal', 'list']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/Sessions?type=Proposal']);
  });

  it('proposal create posts a proposal session only', async () => {
    await run([
      'proposal', 'create',
      '--project-id', 'p-1',
      '--chief-complaint', 'Fix login',
      '--title', 'Login fix',
    ]);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions']);
  });

  // Explicit lifecycle commands (4.3): exactly one request each
  it('proposal generate issues exactly one generate-proposal request', async () => {
    await run(['proposal', 'generate', '--session-id', 's-1', '--proposal-content-language', 'en-US']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/generate-proposal']);
    expect(recorded[0].body).toMatchObject({ proposalContentLanguage: 'en-US' });
  });

  it('proposal execute issues exactly one execute-proposal request', async () => {
    await run(['proposal', 'execute', '--session-id', 's-1']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/execute-proposal']);
  });

  it('proposal annotate issues exactly one annotations request', async () => {
    const inputPath = join(tempDir, 'annotations.json');
    writeFileSync(inputPath, JSON.stringify({ files: [{ fileName: 'proposal.md', filePath: 'proposal.md' }] }));

    await run(['proposal', 'annotate', '--session-id', 's-1', '--input', inputPath]);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/annotations']);
  });

  it('proposal archive issues exactly one archive request', async () => {
    await run(['proposal', 'archive', '--session-id', 's-1']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/archive']);
  });

  it('proposal complete issues exactly one complete request (archive and transition step)', async () => {
    await run(['proposal', 'complete', '--session-id', 's-1']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/complete']);
  });

  it('proposal send issues exactly one messages request', async () => {
    await run(['proposal', 'send', '--session-id', 's-1', '--content', 'continue']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/messages']);
  });

  it('proposal optimize-description issues exactly one optimize-proposal request with the description', async () => {
    await run([
      'proposal', 'optimize-description',
      '--session-id', 's-1',
      '--description', 'Refine this',
      '--default-title',
    ]);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/s-1/optimize-proposal']);
    expect(recorded[0].body).toEqual({ description: 'Refine this', isDefaultTitle: true });
  });

  it('proposal status reads the session before writing the merged update', async () => {
    await run(['proposal', 'status', '--session-id', 's-1', '--status', 'Completed']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/Sessions/s-1', 'PUT /api/Sessions/s-1']);
  });

  // Autotask (5.1, 5.2)
  it('autotask create forwards every optional field the request model supports', async () => {
    await run([
      'autotask', 'create',
      '--title', 'Auto',
      '--project-id', 'p-1',
      '--prompt-id', 'auto-compose-commit.en-US',
      '--message', 'Do it',
      '--preset-id', 'preset-1',
      '--repository-path', 'repos/app',
      '--project-ids', 'p-1', 'p-2',
      '--need-push',
      '--target-branch-mode', 'new-custom',
      '--target-branch-name', 'feature/cli',
      '--script-key', 'autotask.auto-compose-commit',
      '--hero-id', 'hero-1',
      '--target-type', 'Vault',
      '--vault-id', 'vault-1',
    ]);

    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/auto-task']);
    expect(recorded[0].body).toEqual({
      title: 'Auto',
      projectId: 'p-1',
      promptId: 'auto-compose-commit.en-US',
      message: 'Do it',
      presetId: 'preset-1',
      repositoryPath: 'repos/app',
      projectIds: ['p-1', 'p-2'],
      needPush: true,
      targetBranchMode: 'new-custom',
      targetBranchName: 'feature/cli',
      scriptKey: 'autotask.auto-compose-commit',
      heroId: 'hero-1',
      targetType: 'Vault',
      vaultId: 'vault-1',
    });
  });

  it('autotask send targets the given session id messages endpoint', async () => {
    await run(['autotask', 'send', '--session-id', 'autotask-9', '--content', 'continue']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/Sessions/autotask-9/messages']);
  });

  // Vault (6.1 - 6.4)
  it('vault list requests the vault collection', async () => {
    await run(['vault', 'list']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/vaults']);
  });

  it('vault create posts the vault body', async () => {
    await run(['vault', 'create', '--name', 'Notes', '--type', 'folder', '--physical-path', '/vaults/notes']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/vaults']);
    expect(recorded[0].body).toMatchObject({ name: 'Notes', type: 'folder', physicalPath: '/vaults/notes' });
  });

  it('vault update reads the current vault first and keeps omitted fields', async () => {
    await run(['vault', 'update', '--id', 'vault-1', '--name', 'Renamed']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/vaults', 'PUT /api/vaults/vault-1']);
    expect(recorded[1].body).toMatchObject({ name: 'Renamed', physicalPath: '/vaults/main' });
  });

  it('vault delete sends deleteLocalFiles=true when requested', async () => {
    await run(['vault', 'delete', '--id', 'vault-1', '--delete-local-files']);
    expect(recorded.map(requestLine)).toEqual(['DELETE /api/vaults/vault-1?deleteLocalFiles=true']);
  });

  it('vault delete does not request local file cleanup by default', async () => {
    await run(['vault', 'delete', '--id', 'vault-1']);
    expect(recorded.map(requestLine)).toEqual(['DELETE /api/vaults/vault-1?deleteLocalFiles=false']);
  });

  it('vault files list browses the vault path', async () => {
    await run(['vault', 'files', 'list', '--id', 'vault-1', '--path', 'docs']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/vaults/vault-1/files?path=docs']);
  });

  it('vault files preview requests the file content endpoint', async () => {
    await run(['vault', 'files', 'preview', '--id', 'vault-1', '--path', 'docs/a.md']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/vaults/vault-1/files/content?path=docs%2Fa.md']);
  });
});

describe('request paths for skills commands', () => {
  it('skills local list requests the local inventory', async () => {
    await run(['skills', 'local', 'list']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/skills/local']);
  });

  it('skills local uninstall posts the skill name', async () => {
    await run(['skills', 'local', 'uninstall', '--skill-name', 'demo-skill']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/skills/local/uninstall']);
    expect(recorded[0].body).toEqual({ skillName: 'demo-skill' });
  });

  it('skills gallery search sends the keyword as a query parameter', async () => {
    await run(['skills', 'gallery', 'search', '--query', 'react']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/skills/gallery?query=react']);
  });

  it('skills gallery detail sends the id and source', async () => {
    await run(['skills', 'gallery', 'detail', '--id', 'react-best-practices', '--source', 'vercel/skills']);
    expect(recorded.map(requestLine)).toEqual([
      'GET /api/skills/gallery/detail?id=react-best-practices&source=vercel%2Fskills',
    ]);
  });

  it('skills gallery install posts the install body with the version token', async () => {
    await run([
      'skills', 'gallery', 'install',
      '--id', 'react-best-practices',
      '--source', 'vercel/skills',
      '--skill-slug', 'react-best-practices',
      '--version', '1.2.0',
    ]);
    expect(recorded.map(requestLine)).toEqual(['POST /api/skills/gallery/install']);
    expect(recorded[0].body).toEqual({
      id: 'react-best-practices',
      source: 'vercel/skills',
      skillSlug: 'react-best-practices',
      version: '1.2.0',
    });
  });

  it('skills trusted list requests the provider directory', async () => {
    await run(['skills', 'trusted', 'list']);
    expect(recorded.map(requestLine)).toEqual(['GET /api/skills/providers/trusted']);
  });

  it('skills trusted upsert posts the provider document', async () => {
    const inputPath = join(tempDir, 'provider.json');
    writeFileSync(inputPath, JSON.stringify({ providerId: 'acme', displayName: 'Acme', isEnabled: true, sortOrder: 2 }));

    await run(['skills', 'trusted', 'upsert', '--input', inputPath]);
    expect(recorded.map(requestLine)).toEqual(['POST /api/skills/providers/trusted']);
    expect(recorded[0].body).toEqual({ providerId: 'acme', displayName: 'Acme', isEnabled: true, sortOrder: 2 });
  });

  it('skills trusted delete sends the provider id in the request body', async () => {
    await run(['skills', 'trusted', 'delete', '--provider-id', 'vercel']);
    expect(recorded.map(requestLine)).toEqual(['DELETE /api/skills/providers/trusted']);
    expect(recorded[0].body).toEqual({ providerId: 'vercel' });
  });

  it('skills trusted reset posts to the reset endpoint', async () => {
    await run(['skills', 'trusted', 'reset']);
    expect(recorded.map(requestLine)).toEqual(['POST /api/skills/providers/trusted/reset']);
  });
});

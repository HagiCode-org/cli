import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_AIProviderType } from '../../src/generated/api/models/PCode_Models_AIProviderType';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createSession } from './testHelpers';

const INVALID_KEY_MESSAGE =
  "Metadata key 'Role' is invalid: use 1-64 characters, starting with a lowercase letter, then lowercase letters, digits, '.', '_' or '-'.";

function chatWithMetadata(sessionId: string, userMetadata: Record<string, string>) {
  return { ...createSession(sessionId, PCode_Models_SessionType.CHAT), userMetadata };
}

describe('chat create metadata options', () => {
  it('sends the repeated --metadata entries as the metadata map', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'role=master', '--metadata', 'batch=3'],
      dependencies,
    )).toBe(0);

    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    const body = vi.mocked(api.createChatSession).mock.calls[0][0];
    expect(body).toEqual({
      title: 'Chat',
      projectId: 'project-1',
      heroId: undefined,
      executorType: undefined,
      metadata: { role: 'master', batch: '3' },
    });
  });

  it('keeps an equals sign inside a value', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'note=a=b'], dependencies);

    expect(vi.mocked(api.createChatSession).mock.calls[0][0].metadata).toEqual({ note: 'a=b' });
  });

  it('merges a --metadata-json file with --metadata entries', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hagi-metadata-'));
    const file = join(directory, 'meta.json');
    await writeFile(file, '{"master":"abc"}', 'utf8');
    const { dependencies, api } = createDependencies();

    await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'role=worker', '--metadata-json', file],
      dependencies,
    );

    expect(vi.mocked(api.createChatSession).mock.calls[0][0].metadata).toEqual({ role: 'worker', master: 'abc' });
  });

  it('omits the metadata field when no metadata option is given', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--executor-type', 'CodexCli'], dependencies);

    const body = vi.mocked(api.createChatSession).mock.calls[0][0];
    expect(Object.keys(body)).not.toContain('metadata');
    expect(body.executorType).toBe(PCode_Models_AIProviderType.CODEX_CLI);
  });

  it('exits with a usage error and makes no backend call for a malformed --metadata entry', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'role'],
      dependencies,
    )).toBe(EXIT_CODES.USAGE);

    expect(api.createChatSession).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('--metadata expects key=value');
  });

  it('exits with a usage error and makes no backend call for a key given twice', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'role=a', '--metadata', 'role=b'],
      dependencies,
    )).toBe(EXIT_CODES.USAGE);

    expect(api.createChatSession).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Metadata key "role" is given more than once');
  });

  it('exits with the backend message when the backend rejects the metadata as invalid', async () => {
    const { dependencies, api, stderr } = createDependencies({
      createChatSession: vi.fn().mockRejectedValue(createApiError(400, { error: INVALID_KEY_MESSAGE })),
    });

    expect(await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'Role=x'],
      dependencies,
    )).toBe(EXIT_CODES.HTTP_BAD_REQUEST);

    expect(api.createChatSession).toHaveBeenCalledTimes(1);
    expect(stderr.join('')).toContain(INVALID_KEY_MESSAGE);
  });

  it('prints userMetadata in the JSON output from the returned session', async () => {
    const { dependencies, stdout } = createDependencies({
      createChatSession: vi.fn().mockResolvedValue(chatWithMetadata('chat-1', { role: 'master' })),
    });

    expect(await runCli(
      ['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1', '--metadata', 'role=master', '--json'],
      dependencies,
    )).toBe(0);

    expect(JSON.parse(stdout.join('')).session.userMetadata).toEqual({ role: 'master' });
  });

  it('prints a userMetadata line in the human output', async () => {
    const { dependencies, stdout } = createDependencies({
      createChatSession: vi.fn().mockResolvedValue(chatWithMetadata('chat-1', { role: 'master', batch: '3' })),
    });

    await runCli(['node', 'hagi', 'chat', 'create', '--title', 'Chat', '--project-id', 'project-1'], dependencies);

    expect(stdout.join('')).toMatch(/userMetadata +batch=3, role=master\n/);
  });

  it('lists userMetadata only for the sessions that have it', async () => {
    const { dependencies, stdout } = createDependencies({
      listSessions: vi.fn().mockResolvedValue({
        sessions: [chatWithMetadata('chat-1', { role: 'worker' }), createSession('chat-2', PCode_Models_SessionType.CHAT)],
      }),
    });

    await runCli(['node', 'hagi', 'chat', 'list', '--json'], dependencies);

    const sessions = JSON.parse(stdout.join('')).sessions;
    expect(sessions[0].userMetadata).toEqual({ role: 'worker' });
    expect(sessions[1]).not.toHaveProperty('userMetadata');
  });

  it('lists the --metadata and --metadata-json options in its help with the limits', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'chat', 'create', '--help'], dependencies)).toBe(0);

    const help = stdout.join('');
    expect(help).toContain('--metadata <key=value>');
    expect(help).toContain('--metadata-json <file|->');
    expect(help).toContain('at most 16 entries');
    expect(help).toContain('^[a-z][a-z0-9._-]{0,63}$');
    expect(help).toContain('1 to 512 characters');
    expect(help).toContain('do not put secrets in it');
    expect(help).toContain('--metadata role=master');
  });
});

describe('proposal create metadata options', () => {
  const baseArgs = ['node', 'hagi', 'proposal', 'create', '--project-id', 'project-1', '--chief-complaint', 'Add metadata', '--default-title'];

  it('sends the metadata map on the create-session request', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli([...baseArgs, '--metadata', 'role=worker', '--metadata', 'master=abc'], dependencies)).toBe(0);

    expect(vi.mocked(api.createProposalSession).mock.calls[0][0]).toEqual(
      expect.objectContaining({ metadata: { role: 'worker', master: 'abc' }, isDefaultTitle: true }),
    );
  });

  it('omits the metadata field when no metadata option is given', async () => {
    const { dependencies, api } = createDependencies();

    await runCli(baseArgs, dependencies);

    expect(Object.keys(vi.mocked(api.createProposalSession).mock.calls[0][0])).not.toContain('metadata');
  });

  it('exits with a usage error and makes no backend call for malformed metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'hagi-metadata-'));
    const file = join(directory, 'bad.json');
    await writeFile(file, '{"role":"x","role":"y"}', 'utf8');
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli([...baseArgs, '--metadata-json', file], dependencies)).toBe(EXIT_CODES.USAGE);

    expect(api.createProposalSession).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('Metadata key "role" is given more than once');
  });

  it('exits with the backend message when the backend rejects the metadata', async () => {
    const { dependencies, stderr } = createDependencies({
      createProposalSession: vi.fn().mockRejectedValue(createApiError(400, { error: INVALID_KEY_MESSAGE })),
    });

    expect(await runCli([...baseArgs, '--metadata', 'Role=x'], dependencies)).toBe(EXIT_CODES.HTTP_BAD_REQUEST);
    expect(stderr.join('')).toContain(INVALID_KEY_MESSAGE);
  });

  it('prints userMetadata in the proposal get JSON output', async () => {
    const proposal = { ...createSession('session-1'), userMetadata: { role: 'worker' } };
    const { dependencies, stdout } = createDependencies({ getSession: vi.fn().mockResolvedValue(proposal) });

    expect(await runCli(['node', 'hagi', 'proposal', 'get', '--session-id', 'session-1', '--json'], dependencies)).toBe(0);

    expect(stdout.join('')).toContain('"userMetadata": {\n      "role": "worker"\n    }');
  });

  it('keeps the proposal get output free of userMetadata for a session without it', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'proposal', 'get', '--session-id', 'session-1', '--json'], dependencies)).toBe(0);

    expect(stdout.join('')).not.toContain('userMetadata');
  });
});

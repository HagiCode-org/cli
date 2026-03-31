import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { PCode_Models_SessionType } from '../../src/generated/api/models/PCode_Models_SessionType';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createSession } from './testHelpers';

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
    expect(stdout.join('')).toContain('"nextCommand": "hagi proposal generate-name --session-id session-2"');
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
    expect(api.optimizeDescription).toHaveBeenCalledWith('session-1', expect.objectContaining({ description: 'Refine this' }));

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

    expect(stdout.join('')).toContain('"taskId": "task-1"');
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
      generateProposalName: vi.fn().mockRejectedValue(
        createApiError(409, { error: 'Proposal name already exists for this session' }),
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
        ['node', 'hagi', 'proposal', 'generate', '--session-id', 'missing-session', '--json'],
        notFound.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(notFound.stderr.join('')).toContain('"status": 404');

    await expect(
      runCli(
        ['node', 'hagi', 'proposal', 'generate-name', '--session-id', 'session-7', '--json'],
        conflict.dependencies,
      ),
    ).resolves.toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(conflict.stderr.join('')).toContain('"status": 409');
  });
});

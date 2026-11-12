import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerProposalAnnotateCommand } from '../../src/commands/proposal/annotate';
import { registerProposalCompleteCommand } from '../../src/commands/proposal/complete';
import { registerProposalExecuteCommand } from '../../src/commands/proposal/execute';
import { PCode_Models_SessionStatus } from '../../src/generated/api/models/PCode_Models_SessionStatus';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createApiError, createDependencies, createSession } from './testHelpers';

const proposal = (...args: string[]) => ['node', 'hagi', 'proposal', ...args];

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'hagi-proposal-test-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  vi.useRealTimers();
});

const writeInput = (name: string, content: unknown) => {
  const path = join(tempDir, name);
  writeFileSync(path, typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
  return path;
};

async function withStdin<T>(content: string, run: () => Promise<T>): Promise<T> {
  const original = Object.getOwnPropertyDescriptor(process, 'stdin');
  Object.defineProperty(process, 'stdin', { value: Readable.from([content]), configurable: true });
  try {
    return await run();
  } finally {
    if (original) {
      Object.defineProperty(process, 'stdin', original);
    }
  }
}

describe('registration functions', () => {
  it('are exported for the proposal group', () => {
    expect(typeof registerProposalAnnotateCommand).toBe('function');
    expect(typeof registerProposalCompleteCommand).toBe('function');
    expect(typeof registerProposalExecuteCommand).toBe('function');
  });
});

describe('hagi proposal annotate (registerProposalAnnotateCommand)', () => {
  const file = (n: number) => ({ path: `src/f${n}.ts`, annotations: [{ line: n, text: `note ${n}` }] });

  it('submits the document with the session id, counting files when totalAnnotations is absent', async () => {
    const { dependencies, api } = createDependencies();
    const input = writeInput('a.json', { files: [file(1), file(2)], submittedAt: '2026-11-12T00:00:00Z' });

    expect(await runCli(proposal('annotate', '--session-id', ' session-1 ', '--input', input), dependencies)).toBe(0);
    expect(api.submitAnnotations).toHaveBeenCalledExactlyOnceWith('session-1', {
      files: [file(1), file(2)],
      sessionId: 'session-1',
      totalAnnotations: 2,
      submittedAt: '2026-11-12T00:00:00Z',
    });
  });

  it('keeps the totalAnnotations of the document', async () => {
    const { dependencies, api } = createDependencies();
    const input = writeInput('a.json', { files: [file(1)], totalAnnotations: 9 });

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', input), dependencies)).toBe(0);
    expect(vi.mocked(api.submitAnnotations).mock.calls[0][1].totalAnnotations).toBe(9);
  });

  it('overrides a session id in the document with the one from the flag', async () => {
    const { dependencies, api } = createDependencies();
    const input = writeInput('a.json', { files: [], sessionId: 'from-document' });

    expect(await runCli(proposal('annotate', '--session-id', 'from-flag', '--input', input), dependencies)).toBe(0);
    expect(vi.mocked(api.submitAnnotations).mock.calls[0][1].sessionId).toBe('from-flag');
  });

  it('stamps the current time when submittedAt is missing or blank', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T08:30:00.000Z'));
    const missing = createDependencies();
    const blank = createDependencies();

    await runCli(proposal('annotate', '--session-id', 's', '--input', writeInput('m.json', { files: [] })), missing.dependencies);
    await runCli(proposal('annotate', '--session-id', 's', '--input', writeInput('b.json', { files: [], submittedAt: '   ' })), blank.dependencies);

    expect(vi.mocked(missing.api.submitAnnotations).mock.calls[0][1].submittedAt).toBe('2026-11-12T08:30:00.000Z');
    expect(vi.mocked(blank.api.submitAnnotations).mock.calls[0][1].submittedAt).toBe('2026-11-12T08:30:00.000Z');
  });

  it('keeps other fields of the document', async () => {
    const { dependencies, api } = createDependencies();
    const input = writeInput('a.json', { files: [], note: 'extra' });

    await runCli(proposal('annotate', '--session-id', 's', '--input', input), dependencies);

    expect(vi.mocked(api.submitAnnotations).mock.calls[0][1]).toMatchObject({ note: 'extra' });
  });

  it('reads the document from stdin with --input -', async () => {
    const { dependencies, api } = createDependencies();

    const exitCode = await withStdin(JSON.stringify({ files: [file(1)] }), () => runCli(proposal('annotate', '--session-id', 's', '--input', '-'), dependencies));

    expect(exitCode).toBe(0);
    expect(vi.mocked(api.submitAnnotations).mock.calls[0][1].files).toEqual([file(1)]);
  });

  it('prints a human summary with the counts the backend returned', async () => {
    const { dependencies, stdout } = createDependencies({
      submitAnnotations: vi.fn().mockResolvedValue({ message: 'Accepted', annotationCount: 5, fileCount: 2 }),
    });
    const input = writeInput('a.json', { files: [file(1)] });

    expect(await runCli(proposal('annotate', '--session-id', 's-1', '--input', input), dependencies)).toBe(0);
    expect(stdout.join('')).toBe('Proposal annotations submitted\nsessionId        s-1\nmessage          Accepted\nannotationCount  5\nfileCount        2\n');
  });

  it('falls back to the submitted counts when the backend returns none', async () => {
    const { dependencies, stdout } = createDependencies({
      submitAnnotations: vi.fn().mockResolvedValue({ message: 'Accepted' }),
    });
    const input = writeInput('a.json', { files: [file(1), file(2), file(3)], totalAnnotations: 7 });

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', input, '--json'), dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toEqual({ sessionId: 's', message: 'Accepted', annotationCount: 7, fileCount: 3 });
  });

  it.each([
    ['an array', '[]'],
    ['null', 'null'],
    ['a number', '5'],
    ['a string', '"text"'],
  ])('rejects input that is %s with a usage error before any network call', async (_label, content) => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', writeInput('x.json', content)), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Annotation input must be a JSON object.');
    expect(api.submitAnnotations).not.toHaveBeenCalled();
  });

  it('rejects an object without a files array', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', writeInput('x.json', { files: 'nope' })), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Annotation input must include a files array.');
    expect(api.submitAnnotations).not.toHaveBeenCalled();
  });

  it('rejects input that is not valid JSON', async () => {
    const { dependencies, api, stderr } = createDependencies();

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', writeInput('x.json', '{broken')), dependencies)).toBe(EXIT_CODES.USAGE);
    expect(stderr.join('')).toContain('Invalid JSON input');
    expect(api.submitAnnotations).not.toHaveBeenCalled();
  });

  it('fails on a missing input file without submitting', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', join(tempDir, 'missing.json')), dependencies)).not.toBe(0);
    expect(api.submitAnnotations).not.toHaveBeenCalled();
  });

  it.each([
    ['--session-id', ['--input', '-']],
    ['--input', ['--session-id', 's']],
  ])('fails without %s', async (_missing, rest) => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('annotate', ...rest), dependencies)).not.toBe(0);
    expect(api.submitAnnotations).not.toHaveBeenCalled();
  });

  it('maps a rejected submission to its exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      submitAnnotations: vi.fn().mockRejectedValue(createApiError(404, { error: 'Session not found.' })),
    });
    const input = writeInput('a.json', { files: [] });

    expect(await runCli(proposal('annotate', '--session-id', 's', '--input', input), dependencies)).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi proposal complete (registerProposalCompleteCommand)', () => {
  it('completes the trimmed session id once and prints a heading before the summary', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(proposal('complete', '--session-id', '  session-1 '), dependencies)).toBe(0);
    expect(api.completeProposal).toHaveBeenCalledExactlyOnceWith('session-1');
    expect(stdout.join('')).toMatch(/^Proposal completed\n/);
  });

  it('prints the completed session under a session key as JSON', async () => {
    const { dependencies, stdout } = createDependencies({
      completeProposal: vi.fn().mockResolvedValue({ ...createSession('session-9'), status: PCode_Models_SessionStatus.COMPLETED }),
    });

    expect(await runCli(proposal('complete', '--session-id', 'session-9', '--json'), dependencies)).toBe(0);
    const body = JSON.parse(stdout.join(''));
    expect(Object.keys(body)).toEqual(['session']);
    expect(body.session).toMatchObject({ sessionId: 'session-9', status: 'Completed' });
  });

  it('fails without --session-id and completes nothing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('complete'), dependencies)).not.toBe(0);
    expect(api.completeProposal).not.toHaveBeenCalled();
  });

  it('maps a conflict to its exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      completeProposal: vi.fn().mockRejectedValue(createApiError(409, { error: 'Session is not archived.' })),
    });

    expect(await runCli(proposal('complete', '--session-id', 's'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stdout.join('')).toBe('');
  });
});

describe('hagi proposal execute (registerProposalExecuteCommand)', () => {
  it('starts execution without a hero and prints a human summary', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(proposal('execute', '--session-id', ' session-1 '), dependencies)).toBe(0);
    expect(api.executeProposal).toHaveBeenCalledExactlyOnceWith('session-1', { heroId: undefined });
    expect(stdout.join('')).toBe('Proposal execution started\nsessionId  session-1\nmessage    Proposal execution started\n');
  });

  it('passes a trimmed hero override and reports it as requested in JSON', async () => {
    const { dependencies, api, stdout } = createDependencies();

    expect(await runCli(proposal('execute', '--session-id', 's', '--hero-id', '  hero-7 ', '--json'), dependencies)).toBe(0);
    expect(api.executeProposal).toHaveBeenCalledWith('s', { heroId: 'hero-7' });
    expect(JSON.parse(stdout.join(''))).toEqual({ sessionId: 's', message: 'Proposal execution started', requested: { heroId: 'hero-7' } });
  });

  it('drops a blank hero override', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('execute', '--session-id', 's', '--hero-id', '   '), dependencies)).toBe(0);
    expect(api.executeProposal).toHaveBeenCalledWith('s', { heroId: undefined });
  });

  it('fails without --session-id and starts nothing', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(proposal('execute'), dependencies)).not.toBe(0);
    expect(api.executeProposal).not.toHaveBeenCalled();
  });

  it('maps a rejected start to its exit code and prints no success text', async () => {
    const { dependencies, stdout } = createDependencies({
      executeProposal: vi.fn().mockRejectedValue(createApiError(409, { error: 'Already executing.' })),
    });

    expect(await runCli(proposal('execute', '--session-id', 's'), dependencies)).toBe(EXIT_CODES.HTTP_CONFLICT);
    expect(stdout.join('')).toBe('');
  });
});

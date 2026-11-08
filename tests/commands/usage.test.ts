import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import type { TokenMonitorUsageSnapshot } from '../../src/runtime/hagiApi';
import { createDependencies, createTokenMonitorSnapshot } from './testHelpers';

const ROOT = join(__dirname, '..', '..');

/** Command dependencies whose clock advances when the command sleeps, so a wait runs instantly and deterministically. */
function timedDependencies(input: TokenMonitorUsageSnapshot | Error | Array<TokenMonitorUsageSnapshot | Error>) {
  const queue: Array<TokenMonitorUsageSnapshot | Error> = Array.isArray(input) ? [...input] : [input];
  const read = vi.fn(async () => {
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    if (next instanceof Error) {
      throw next;
    }
    return next;
  });
  let nowMs = Date.parse('2026-11-08T22:00:00Z');
  const created = createDependencies({ getTokenMonitorUsage: read });

  return {
    ...created,
    read,
    dependencies: {
      ...created.dependencies,
      now: () => nowMs,
      sleep: vi.fn(async (ms: number) => {
        nowMs += ms;
      }),
    },
  };
}

function snapshotWithClaude(remainingPercent: number, resetsAtUtc = '2026-11-08T23:50:00Z'): TokenMonitorUsageSnapshot {
  return createTokenMonitorSnapshot({
    limits: {
      providers: [{
        provider: 'claude',
        status: 'ok',
        windows: [{ kind: 'session', remainingPercent, resetsAtUtc, windowMinutes: 300 }],
      }],
    },
  });
}

const UNAVAILABLE = createTokenMonitorSnapshot({
  status: 'readFailed',
  source: 'none',
  failureReason: 'usage file is not valid JSON',
  limits: undefined,
});

describe('usage limits command: plain read', () => {
  it('prints every provider window in json with exit 0 and lists the reset facts', async () => {
    const created = createDependencies();
    const dependencies = { ...created.dependencies, now: () => Date.parse('2026-11-08T22:00:00Z') };
    const { api, stdout } = created;

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--json'], dependencies)).toBe(0);
    expect(api.getTokenMonitorUsage).toHaveBeenCalledOnce();

    const payload = JSON.parse(stdout.join(''));
    expect(payload).toMatchObject({ state: null, reason: null, status: 'ok', dateKey: '2026-11-08', totalTokens: '12345', guard: null });
    expect(payload.windows).toContainEqual({
      provider: 'claude',
      kind: 'session',
      remainingPercent: 43,
      resetsAtUtc: '2026-11-08T23:10:00Z',
      minutesToReset: 70,
      windowMinutes: 300,
      watched: true,
    });
    expect(payload.windows.map((window: { provider: string }) => window.provider)).toEqual(['claude', 'claude', 'codex']);
  });

  it('keeps the json key order fixed for each window', async () => {
    const { dependencies, stdout } = createDependencies();
    await runCli(['node', 'hagi', 'usage', 'limits', '--provider', 'codex', '--json'], dependencies);

    const window = JSON.parse(stdout.join('')).windows[0];
    expect(Object.keys(window)).toEqual([
      'provider', 'kind', 'remainingPercent', 'resetsAtUtc', 'minutesToReset', 'windowMinutes', 'watched',
    ]);
  });

  it('derives the codex remaining percent from its used percent', async () => {
    const { dependencies, stdout } = createDependencies();
    await runCli(['node', 'hagi', 'usage', 'limits', '--provider', 'codex', '--json'], dependencies);

    expect(JSON.parse(stdout.join('')).windows).toEqual([expect.objectContaining({ provider: 'codex', remainingPercent: 70 })]);
  });

  it('starts the human text with READ and names each window with its reset time', async () => {
    const created = createDependencies();
    const dependencies = { ...created.dependencies, now: () => Date.parse('2026-11-08T22:00:00Z') };

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--provider', 'claude'], dependencies)).toBe(0);
    const text = created.stdout.join('');
    expect(text.startsWith('READ claude:')).toBe(true);
    expect(text).toContain('claude session [300 min]: remaining 43%, resets 2026-11-08T23:10:00Z (in 70 min)');
    expect(text).toContain('claude weekly [10080 min]: remaining 81%');
    expect(text).toContain('(not watched: weekly or longer)');
    expect(text).not.toContain('codex');
  });

  it('exits 0 for a low window, because a plain read is a reading and not a failure', async () => {
    const { dependencies, stdout } = createDependencies({ getTokenMonitorUsage: vi.fn().mockResolvedValue(snapshotWithClaude(2)) });

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--provider', 'claude', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join('')).windows).toEqual([expect.objectContaining({ remainingPercent: 2 })]);
  });

  it('exits 34 with unknown and the reason when the snapshot is not usable', async () => {
    const { dependencies, stdout, stderr } = createDependencies({ getTokenMonitorUsage: vi.fn().mockResolvedValue(UNAVAILABLE) });

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--json'], dependencies)).toBe(EXIT_CODES.QUOTA_UNKNOWN);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      state: 'unknown',
      reason: 'Token Monitor status is readFailed: usage file is not valid JSON',
    });
    expect(stderr.join('')).toContain('usage file is not valid JSON');
  });

  it('exits 34 and prints UNAVAILABLE when the requested provider has no window with a figure', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--provider', 'gemini'], dependencies)).toBe(EXIT_CODES.QUOTA_UNKNOWN);
    expect(stdout.join('')).toMatch(/^UNAVAILABLE gemini: no gemini window/);
  });

  it('keeps the transport exit code when the backend cannot be reached', async () => {
    const { dependencies } = createDependencies({ getTokenMonitorUsage: vi.fn().mockRejectedValue(new Error('fetch failed')) });

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--json'], dependencies)).toBe(EXIT_CODES.TRANSPORT);
  });
});

describe('usage limits command: bounded wait', () => {
  it('returns ready with exit 0, and adds no stagger when the first read is already above the threshold', async () => {
    const { dependencies, stdout } = createDependencies();

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--json'], dependencies)).toBe(0);
    expect(JSON.parse(stdout.join(''))).toMatchObject({
      state: 'ready',
      guard: { state: 'ready', thresholdPercent: 10, waitedSeconds: 0, jitterSeconds: 0, blockers: [] },
    });
  });

  it('starts the human text with READY when the wait is satisfied', async () => {
    const { dependencies, stdout } = createDependencies();
    await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude'], dependencies);

    expect(stdout.join('')).toMatch(/^READY claude: every watched window is above 10% remaining/);
  });

  it('returns low with exit 0 after --max-wait 0 and names the blocking window and its reset', async () => {
    const created = createDependencies({ getTokenMonitorUsage: vi.fn().mockResolvedValue(snapshotWithClaude(4)) });

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--max-wait', '0', '--json'], created.dependencies))
      .toBe(0);
    const payload = JSON.parse(created.stdout.join(''));
    expect(payload).toMatchObject({ state: 'low', guard: { state: 'low', waitedSeconds: 0, blockers: [expect.objectContaining({ remainingPercent: 4 })] } });
    expect(created.stderr.join('')).toBe('');
  });

  it('prints LOW in text and still exits 0', async () => {
    const created = createDependencies({ getTokenMonitorUsage: vi.fn().mockResolvedValue(snapshotWithClaude(4, '2026-11-08T23:50:00Z')) });

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--max-wait', '0'], created.dependencies))
      .toBe(0);
    expect(created.stdout.join('')).toMatch(/^LOW claude: at or below 10% after waiting 0s: claude session 4% remaining, resets 2026-11-08T23:50:00Z/);
  });

  it('waits toward the reset in bounded steps, then returns low when the limit expires', async () => {
    const created = timedDependencies(snapshotWithClaude(4, '2026-11-08T23:30:00Z'));

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--max-wait', '480', '--jitter-seconds', '0', '--json'], created.dependencies))
      .toBe(0);
    expect(JSON.parse(created.stdout.join('')).guard).toMatchObject({ state: 'low', waitedSeconds: 480 });
    expect(created.read.mock.calls.length).toBeGreaterThan(1);
  });

  it('returns ready once a reset raises the window during the wait', async () => {
    const created = timedDependencies([snapshotWithClaude(4, '2026-11-08T22:20:00Z'), snapshotWithClaude(40, '2026-11-08T23:20:00Z')]);

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--jitter-seconds', '0', '--json'], created.dependencies))
      .toBe(0);
    expect(JSON.parse(created.stdout.join('')).guard).toMatchObject({ state: 'ready', waitedSeconds: 300 });
  });

  it('exits 34 with unknown when every read in the retry allowance fails', async () => {
    const created = timedDependencies(new Error('connection reset'));
    const code = await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--max-wait', '1800', '--json'], created.dependencies);

    expect(code).toBe(EXIT_CODES.QUOTA_UNKNOWN);
    expect(JSON.parse(created.stdout.join('')).guard).toMatchObject({ state: 'unknown', reason: 'connection reset' });
    expect(created.stderr.join('')).toContain('connection reset');
  });

  it('exits 34 when the wait reads an unusable snapshot', async () => {
    const created = createDependencies({ getTokenMonitorUsage: vi.fn().mockResolvedValue(UNAVAILABLE) });

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--max-wait', '0'], created.dependencies))
      .toBe(EXIT_CODES.QUOTA_UNKNOWN);
    expect(created.stdout.join('')).toMatch(/^UNAVAILABLE claude: Token Monitor status is readFailed/);
  });
});

describe('usage limits command: option checks run before any backend call', () => {
  const refusals: Array<[string, string[]]> = [
    ['--max-wait without --wait-until-above', ['--provider', 'claude', '--max-wait', '60']],
    ['--jitter-seconds without --wait-until-above', ['--provider', 'claude', '--jitter-seconds', '60']],
    ['--wait-until-above without --provider', ['--wait-until-above', '10']],
    ['--max-wait above 21600', ['--wait-until-above', '10', '--provider', 'claude', '--max-wait', '21601']],
    ['--jitter-seconds above 3600', ['--wait-until-above', '10', '--provider', 'claude', '--jitter-seconds', '3601']],
    ['a non-numeric --max-wait', ['--wait-until-above', '10', '--provider', 'claude', '--max-wait', 'soon']],
  ];

  for (const [label, args] of refusals) {
    it(`exits 2 for ${label}`, async () => {
      const { dependencies, api, stderr } = createDependencies();

      expect(await runCli(['node', 'hagi', 'usage', 'limits', ...args], dependencies)).toBe(EXIT_CODES.USAGE);
      expect(api.getTokenMonitorUsage).not.toHaveBeenCalled();
      expect(stderr.join('')).toMatch(/--max-wait|--jitter-seconds|--wait-until-above|--provider/);
    });
  }

  it('accepts the largest allowed --max-wait', async () => {
    const { dependencies, api } = createDependencies();

    expect(await runCli(['node', 'hagi', 'usage', 'limits', '--wait-until-above', '10', '--provider', 'claude', '--max-wait', '21600', '--json'], dependencies))
      .toBe(0);
    expect(api.getTokenMonitorUsage).toHaveBeenCalled();
  });
});

describe('usage limits command: local data', () => {
  it('reads no Token Monitor file and no config.yaml: the command and its helpers import no file API', () => {
    const sources = [
      'src/commands/usage.ts',
      'src/formatters/usage.ts',
      'src/runtime/usageLimits.ts',
    ].map(path => readFileSync(join(ROOT, path), 'utf8'));

    for (const source of sources) {
      expect(source).not.toMatch(/from ['"](node:)?fs(\/promises)?['"]/);
      expect(source).not.toMatch(/config\.yaml/i);
    }
  });
});

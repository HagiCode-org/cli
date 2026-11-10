import { execFile, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runCli } from '../../src/main';
import { EXIT_CODES } from '../../src/runtime/errors';
import { loadSagaAssets } from '../../src/runtime/saga/assets';
import { installSagaResources } from '../../src/runtime/saga/install';
import { createPlannedSagaAt, snapshotFiles, writeProof } from '../runtime/saga/fixtures/saga-fixture';
import { createDependencies } from './testHelpers';

let workspace: string;
let projectPath: string;
let sagaRoot: string;

/** Initialized project with one Saga `demo` holding a complete plan (two items, one acceptance command each). */
function createPlannedSaga(id = 'demo'): void {
  installSagaResources(projectPath, loadSagaAssets());
  const directory = path.join(sagaRoot, id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'saga.json'), JSON.stringify({ id, createdAt: '2026-01-01T00:00:00Z', method: 1 }));
  writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nShip the change.\n');
  writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## Open questions\n- none\n');
  writeFileSync(
    path.join(directory, 'acceptance.md'),
    '# Acceptance\n\n## T1\ncmd: node -e "process.exit(0)"\n\n## T2\ncmd: node -e "process.exit(0)"\n',
  );
  writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [ ] T1 First item |\n- [ ] T2 Second item |\n');
}

function sagaDirectory(id = 'demo'): string {
  return path.join(sagaRoot, id);
}

function runtimeFile(name: string, id = 'demo'): string {
  return path.join(sagaDirectory(id), 'runtime', name);
}

function writeRuntimeStatus(state: string, id = 'demo'): void {
  mkdirSync(path.join(sagaDirectory(id), 'runtime'), { recursive: true });
  writeFileSync(runtimeFile('status.json', id), JSON.stringify({ schema: 'saga-status/2', state }));
}

async function saga(args: string[], env: Record<string, string> = {}) {
  const harness = createDependencies();
  Object.assign(harness.dependencies.env, env);
  const exitCode = await runCli(['node', 'hagi', 'saga', ...args], harness.dependencies);
  return { exitCode, stdout: harness.stdout.join(''), stderr: harness.stderr.join(''), api: harness.api };
}

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-write-')));
  projectPath = path.join(workspace, 'Project With Spaces');
  mkdirSync(projectPath);
  sagaRoot = path.join(projectPath, '.hagicode', 'sagas');
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('saga claim, assert-owner and release', () => {
  it('claims in human mode and prints the token and owner session', async () => {
    createPlannedSaga();
    const result = await saga(['claim', 'demo', '--path', projectPath, '--session', 'orchestrator-1']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('claimed: demo');
    expect(result.stdout).toContain('owner session  orchestrator-1');
    const lock = JSON.parse(readFileSync(runtimeFile('execute.lock'), 'utf8'));
    expect(result.stdout).toContain(`token          ${lock.token}`);
  });

  it('claims in JSON mode with the canonical result shape', async () => {
    createPlannedSaga();
    const result = await saga(['claim', 'demo', '--path', projectPath, '--session', 's1', '--json']);
    const body = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(body).toMatchObject({ sagaId: 'demo', command: 'claim', ok: true, ownerSession: 's1' });
    expect(body.token.length).toBeGreaterThan(0);
    expect(body.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(result.stderr).toBe('');
  });

  it('marks the owner session as the Saga master through the backend', async () => {
    createPlannedSaga();
    const result = await saga(['claim', 'demo', '--path', projectPath, '--session', 's1', '--json']);
    const body = JSON.parse(result.stdout);

    expect(result.api.addSessionUserMetadata).toHaveBeenCalledWith('s1', { 'saga.id': 'demo', 'saga.role': 'master' });
    expect(body.master).toEqual({ sessionId: 's1', marked: true });
  });

  it('keeps the claim when the backend cannot mark the owner session, and says why', async () => {
    createPlannedSaga();
    const harness = createDependencies({ addSessionUserMetadata: vi.fn().mockRejectedValue(new Error('session not found')) });
    const exitCode = await runCli(
      ['node', 'hagi', 'saga', 'claim', 'demo', '--path', projectPath, '--session', 'orchestrator-1'],
      harness.dependencies,
    );
    const stdout = harness.stdout.join('');

    expect(exitCode).toBe(0);
    expect(existsSync(runtimeFile('execute.lock'))).toBe(true);
    expect(stdout).toContain('master mark    not set: session not found');
  });

  it('skips the mark with --no-mark-session', async () => {
    createPlannedSaga();
    const result = await saga(['claim', 'demo', '--path', projectPath, '--session', 's1', '--no-mark-session', '--json']);
    const body = JSON.parse(result.stdout);

    expect(result.exitCode).toBe(0);
    expect(result.api.addSessionUserMetadata).not.toHaveBeenCalled();
    expect(body.master).toEqual({ sessionId: 's1', marked: false, reason: 'skipped by --no-mark-session' });
  });

  it('does not try to mark the owner session when the claim is refused', async () => {
    createPlannedSaga();
    await saga(['claim', 'demo', '--path', projectPath, '--session', 'first']);
    const second = await saga(['claim', 'demo', '--path', projectPath, '--session', 'second']);

    expect(second.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(second.api.addSessionUserMetadata).not.toHaveBeenCalled();
  });

  it('rejects a missing or empty session as a usage error without creating runtime files', async () => {
    createPlannedSaga();
    const empty = await saga(['claim', 'demo', '--path', projectPath, '--session', '  ']);
    expect(empty.exitCode).toBe(EXIT_CODES.USAGE);
    const missing = await saga(['claim', 'demo', '--path', projectPath]);
    expect(missing.exitCode).toBe(EXIT_CODES.USAGE);
    expect(existsSync(path.join(sagaDirectory(), 'runtime'))).toBe(false);
  });

  it('refuses a second claim with exit 1 that names the owning session and leaves the lock unchanged', async () => {
    createPlannedSaga();
    expect((await saga(['claim', 'demo', '--path', projectPath, '--session', 'first'])).exitCode).toBe(0);
    const bytes = readFileSync(runtimeFile('execute.lock'));

    const second = await saga(['claim', 'demo', '--path', projectPath, '--session', 'second', '--json']);
    expect(second.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(second.stdout)).toMatchObject({ ok: false, command: 'claim' });
    expect(JSON.parse(second.stdout).errors.join(' ')).toContain('owned by session first');
    expect(readFileSync(runtimeFile('execute.lock')).equals(bytes)).toBe(true);
  });

  it('checks ownership: no lock passes, holder token passes, missing or different token is refused', async () => {
    createPlannedSaga();
    const none = await saga(['assert-owner', 'demo', '--path', projectPath]);
    expect(none.exitCode).toBe(0);
    expect(none.stdout).toContain('no owner');

    const claim = JSON.parse(
      (await saga(['claim', 'demo', '--path', projectPath, '--session', 'owner', '--json'])).stdout,
    );
    expect((await saga(['assert-owner', 'demo', '--path', projectPath, '--token', claim.token])).exitCode).toBe(0);
    expect((await saga(['assert-owner', 'demo', '--path', projectPath])).exitCode).toBe(EXIT_CODES.REFUSED);
    expect((await saga(['assert-owner', 'demo', '--path', projectPath, '--token', 'nope'])).exitCode).toBe(EXIT_CODES.REFUSED);
  });

  it('reads the execution token from SAGA_EXECUTION_TOKEN when --token is absent', async () => {
    createPlannedSaga();
    const claim = JSON.parse(
      (await saga(['claim', 'demo', '--path', projectPath, '--session', 'owner', '--json'])).stdout,
    );
    const viaEnv = await saga(['assert-owner', 'demo', '--path', projectPath, '--json'], {
      SAGA_EXECUTION_TOKEN: claim.token,
    });
    expect(viaEnv.exitCode).toBe(0);
    expect(JSON.parse(viaEnv.stdout)).toMatchObject({ ok: true, command: 'assert-owner', locked: true });
  });

  it('refuses --token with --project-id as a usage error before any backend request', async () => {
    createPlannedSaga();
    const result = await saga(['assert-owner', 'demo', '--project-id', 'project-1', '--token', 'secret']);

    expect(result.exitCode).toBe(EXIT_CODES.USAGE);
    expect(result.stderr).toContain('SAGA_EXECUTION_TOKEN');
    expect(result.api.listProjects).not.toHaveBeenCalled();
  });

  it('releases only with the holder token, confirmed workers and a paused or done snapshot', async () => {
    createPlannedSaga();
    const claim = JSON.parse(
      (await saga(['claim', 'demo', '--path', projectPath, '--session', 'owner', '--json'])).stdout,
    );
    const base = ['release', 'demo', '--path', projectPath];

    expect((await saga([...base, '--token', claim.token, '--workers-settled'])).exitCode).toBe(EXIT_CODES.REFUSED);
    writeRuntimeStatus('running');
    expect((await saga([...base, '--token', claim.token, '--workers-settled'])).exitCode).toBe(EXIT_CODES.REFUSED);
    writeRuntimeStatus('paused');
    expect((await saga([...base, '--token', 'wrong', '--workers-settled'])).exitCode).toBe(EXIT_CODES.REFUSED);
    expect((await saga([...base, '--token', claim.token])).exitCode).toBe(EXIT_CODES.REFUSED);
    expect(existsSync(runtimeFile('execute.lock'))).toBe(true);

    const released = await saga([...base, '--token', claim.token, '--workers-settled']);
    expect(released.exitCode).toBe(0);
    expect(released.stdout).toContain('released: demo');
    expect(existsSync(runtimeFile('execute.lock'))).toBe(false);

    const again = await saga([...base, '--token', claim.token, '--workers-settled', '--json']);
    expect(again.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(again.stdout).errors.join(' ')).toContain('nothing to release');
  });

  it('refuses release on a Saga without a lock', async () => {
    createPlannedSaga();
    writeRuntimeStatus('paused');
    expect((await saga(['release', 'demo', '--path', projectPath, '--workers-settled'])).exitCode).toBe(EXIT_CODES.REFUSED);
    expect(existsSync(runtimeFile('execute.lock'))).toBe(false);
  });

  it('reports a missing Saga with the existing not-found code and creates nothing', async () => {
    installSagaResources(projectPath, loadSagaAssets());
    const result = await saga(['claim', 'ghost', '--path', projectPath, '--session', 's1']);
    expect(result.exitCode).toBe(EXIT_CODES.HTTP_NOT_FOUND);
    expect(existsSync(path.join(sagaRoot, 'ghost'))).toBe(false);
  });
});

describe('saga check and freeze', () => {
  it('checks a plan with exit 0, a refusal with exit 1 listing every reason, and usage error 2 for an unknown phase', async () => {
    createPlannedSaga();
    const plan = await saga(['check', 'demo', '--path', projectPath, '--phase', 'plan', '--json']);
    expect(plan.exitCode).toBe(0);
    expect(JSON.parse(plan.stdout)).toMatchObject({ ok: true, command: 'check', sagaId: 'demo', errors: [] });

    const run = await saga(['check', 'demo', '--path', projectPath, '--json']);
    expect(run.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(run.stdout)).toMatchObject({ ok: false, command: 'check' });
    expect(JSON.parse(run.stdout).errors).toEqual(['contract.lock missing: run freeze first']);

    const unknown = await saga(['check', 'demo', '--path', projectPath, '--phase', 'later']);
    expect(unknown.exitCode).toBe(EXIT_CODES.USAGE);
  });

  it('leaves every file unchanged when checking', async () => {
    createPlannedSaga();
    const before = snapshotFiles(sagaRoot);
    await saga(['check', 'demo', '--path', projectPath, '--phase', 'plan']);
    await saga(['check', 'demo', '--path', projectPath]);
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });

  it('freezes revision 1, reports an unchanged repeat, and refuses an unsafe contract with every reason', async () => {
    createPlannedSaga();
    const first = await saga(['freeze', 'demo', '--path', projectPath, '--json']);
    expect(first.exitCode).toBe(0);
    expect(JSON.parse(first.stdout)).toMatchObject({ ok: true, command: 'freeze', revision: 1, unchanged: false });

    const repeat = await saga(['freeze', 'demo', '--path', projectPath]);
    expect(repeat.exitCode).toBe(0);
    expect(repeat.stdout).toContain('stays at revision 1');

    writeFileSync(path.join(sagaDirectory(), 'research.md'), '# Research\n\n## Open questions\n- which store\n');
    writeFileSync(path.join(sagaDirectory(), 'goal.md'), '# Goal\n\nChanged.\n');
    const refused = await saga(['freeze', 'demo', '--path', projectPath]);
    expect(refused.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(refused.stdout).toContain('refused: freeze demo');
    expect(refused.stdout).toContain('which store');
  });

  it('refuses freeze with a token mismatch while a lock exists and leaves every file unchanged', async () => {
    createPlannedSaga();
    const claim = JSON.parse((await saga(['claim', 'demo', '--path', projectPath, '--session', 'owner', '--json'])).stdout);
    const before = snapshotFiles(sagaRoot);

    const wrong = await saga(['freeze', 'demo', '--path', projectPath, '--token', 'not-it']);
    expect(wrong.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(snapshotFiles(sagaRoot)).toEqual(before);

    const right = await saga(['freeze', 'demo', '--path', projectPath, '--token', claim.token]);
    expect(right.exitCode).toBe(0);
  });

});

describe('saga tick, block, amend and archive', () => {
  function writeEvidence(id: string, reportStatus = 'Status: PASS') {
    mkdirSync(path.join(sagaDirectory(), 'runtime', 'reports'), { recursive: true });
    mkdirSync(path.join(sagaDirectory(), 'runtime', 'evidence'), { recursive: true });
    writeFileSync(path.join(sagaDirectory(), 'runtime', 'reports', `${id}.md`), `# ${id}\n${reportStatus}\n`);
    writeFileSync(path.join(sagaDirectory(), 'runtime', 'evidence', `${id}.log`), 'exit 0\n');
  }

  it('ticks and blocks with exit 0 and the canonical JSON shapes', async () => {
    createPlannedSaga();
    expect((await saga(['freeze', 'demo', '--path', projectPath])).exitCode).toBe(0);
    writeEvidence('T1');

    const ticked = await saga(['tick', 'demo', 'T1', '--path', projectPath, '--json']);
    expect(ticked.exitCode).toBe(0);
    expect(JSON.parse(ticked.stdout)).toEqual({ sagaId: 'demo', command: 'tick', ok: true, itemId: 'T1', evidence: 'evidence/T1.log' });

    const blocked = await saga(['block', 'demo', 'T2', 'tests keep failing', '--path', projectPath, '--json']);
    expect(blocked.exitCode).toBe(0);
    expect(JSON.parse(blocked.stdout)).toMatchObject({ ok: true, command: 'block', itemId: 'T2', reason: 'tests keep failing' });
  });

  it('exits 1 with the missing proof for an unproven tick and 2 for an empty block reason', async () => {
    createPlannedSaga();
    await saga(['freeze', 'demo', '--path', projectPath]);
    const refused = await saga(['tick', 'demo', 'T1', '--path', projectPath, '--json']);
    expect(refused.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(refused.stdout).errors.join(' ')).toContain('no PASS report for T1');

    const empty = await saga(['block', 'demo', 'T2', '  ', '--path', projectPath]);
    expect(empty.exitCode).toBe(EXIT_CODES.USAGE);
  });

  it('amends with a numbered open file and refuses an empty title as usage error 2', async () => {
    createPlannedSaga();
    const amended = await saga(['amend', 'demo', 'Add retry', 'Retry twice', '--path', projectPath, '--json']);
    expect(amended.exitCode).toBe(0);
    expect(JSON.parse(amended.stdout)).toMatchObject({ ok: true, command: 'amend', name: '001-add-retry.md', merged: false });
    expect((await saga(['amend', 'demo', '', 'text', '--path', projectPath])).exitCode).toBe(EXIT_CODES.USAGE);
  });

  it('refuses archive of an unfinished Saga with exit 1 and archives it with --force', async () => {
    createPlannedSaga();
    const refused = await saga(['archive', 'demo', '--path', projectPath, '--json']);
    expect(refused.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(refused.stdout).errors).toEqual(expect.arrayContaining(['item T1 is pending']));

    const forced = await saga(['archive', 'demo', '--path', projectPath, '--force', '--json']);
    expect(forced.exitCode).toBe(0);
    expect(JSON.parse(forced.stdout).destination).toMatch(/archive[\\/]\d{4}-\d\d-\d\d-demo$/);
  });

  it('leaves progress.md, blocked.json and status.json byte-identical on a token mismatch', async () => {
    createPlannedSaga();
    await saga(['freeze', 'demo', '--path', projectPath]);
    writeEvidence('T1');
    writeRuntimeStatus('running');
    await saga(['claim', 'demo', '--path', projectPath, '--session', 'owner']);
    const before = snapshotFiles(sagaRoot);

    const attempts = [
      ['tick', 'demo', 'T1', '--path', projectPath, '--token', 'wrong'],
      ['block', 'demo', 'T2', 'reason', '--path', projectPath],
      ['amend', 'demo', 'Late', 'text', '--path', projectPath, '--token', 'wrong'],
      ['archive', 'demo', '--path', projectPath, '--force'],
    ];
    for (const args of attempts) {
      expect((await saga(args)).exitCode).toBe(EXIT_CODES.REFUSED);
    }
    expect(snapshotFiles(sagaRoot)).toEqual(before);
  });

});

describe('saga set-status and contention', () => {
  it('writes the snapshot with exit 0, refuses bad states with exit 2, and leaves the read-only status projection byte-identical', async () => {
    createPlannedSaga();
    const paused = await saga(['set-status', 'demo', '--state', 'paused', '--note', 'freeze refused', '--path', projectPath, '--json']);
    expect(paused.exitCode).toBe(0);
    expect(JSON.parse(paused.stdout)).toMatchObject({ ok: true, command: 'set-status', sagaId: 'demo', state: 'paused', note: 'freeze refused' });

    const bytes = readFileSync(runtimeFile('status.json'));
    const status = await saga(['status', 'demo', '--path', projectPath, '--json']);
    expect(status.exitCode).toBe(0);
    expect(readFileSync(runtimeFile('status.json')).equals(bytes)).toBe(true);

    expect((await saga(['set-status', 'demo', '--state', 'archived', '--path', projectPath])).exitCode).toBe(EXIT_CODES.USAGE);
    expect((await saga(['set-status', 'demo', '--path', projectPath])).exitCode).toBe(EXIT_CODES.USAGE);
    expect(readFileSync(runtimeFile('status.json')).equals(bytes)).toBe(true);
  });

  it('refuses planned while the plan is incomplete and writes no status file', async () => {
    createPlannedSaga();
    writeFileSync(path.join(sagaDirectory(), 'acceptance.md'), '# Acceptance\n\n## T1\ncmd: true\n');
    const result = await saga(['set-status', 'demo', '--state', 'planned', '--path', projectPath, '--json']);
    expect(result.exitCode).toBe(EXIT_CODES.REFUSED);
    expect(JSON.parse(result.stdout).errors).toEqual(['item T2 has no acceptance cmd in acceptance.md']);
    expect(existsSync(runtimeFile('status.json'))).toBe(false);
  });

  it('lets only the claim winner tick, block and set status when two processes compete, on repeated rounds', async () => {
    const workerPath = path.join(__dirname, '..', 'runtime', 'saga', 'fixtures', 'claim-worker.ts');
    const execute = promisify(execFile);

    for (let round = 0; round < 3; round += 1) {
      const id = `race-${round}`;
      createPlannedSagaAt(sagaRoot, id);
      expect((await saga(['freeze', id, '--path', projectPath])).exitCode).toBe(0);

      const attempts = await Promise.all(['alpha', 'beta'].map(session =>
        execute(process.execPath, ['--import', 'tsx', workerPath, sagaRoot, id, session], {
          cwd: path.resolve(__dirname, '..', '..'),
        }).then(
          ({ stdout }) => ({ code: 0, body: JSON.parse(stdout) }),
          (error: { code: number; stdout: string }) => ({ code: error.code, body: JSON.parse(error.stdout || '{}') }),
        ),
      ));
      const winner = attempts.find(attempt => attempt.code === 0);
      expect(attempts.filter(attempt => attempt.code === 1)).toHaveLength(1);
      expect(winner).toBeDefined();
      const token = winner!.body.token as string;

      const before = snapshotFiles(path.join(sagaRoot, id));
      const forged = ['--token', 'forged-token'];
      expect((await saga(['tick', id, 'T1', '--path', projectPath, ...forged])).exitCode).toBe(EXIT_CODES.REFUSED);
      expect((await saga(['block', id, 'T2', 'nope', '--path', projectPath])).exitCode).toBe(EXIT_CODES.REFUSED);
      expect((await saga(['set-status', id, '--state', 'paused', '--path', projectPath, ...forged])).exitCode).toBe(EXIT_CODES.REFUSED);
      expect(snapshotFiles(path.join(sagaRoot, id))).toEqual(before);

      writeProof(path.join(sagaRoot, id), 'T1');
      expect((await saga(['tick', id, 'T1', '--path', projectPath, '--token', token])).exitCode).toBe(0);
      expect((await saga(['block', id, 'T2', 'waiting', '--path', projectPath, '--token', token])).exitCode).toBe(0);
      expect((await saga(['set-status', id, '--state', 'paused', '--path', projectPath, '--token', token])).exitCode).toBe(0);
      expect(JSON.parse(readFileSync(path.join(sagaRoot, id, 'runtime', 'status.json'), 'utf8')).state).toBe('paused');
    }
  }, 120_000);
});

describe('end-to-end Saga lifecycle', () => {
  async function runLifecycle() {
    installSagaResources(projectPath, loadSagaAssets());
    const created = await saga(['new', 'e2e', '--path', projectPath]);
    expect(created.exitCode).toBe(0);
    expect(existsSync(path.join(sagaRoot, 'tools'))).toBe(false);

    const directory = path.join(sagaRoot, 'e2e');
    writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nShip the lifecycle.\n');
    writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## Open questions\n- none\n');
    writeFileSync(
      path.join(directory, 'acceptance.md'),
      '# Acceptance\n\n## T1\ncmd: node -e "process.exit(0)"\n\n## T2\ncmd: node -e "process.exit(0)"\n',
    );
    writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [ ] T1 First item |\n- [ ] T2 Second item |\n');
    const base = ['--path', projectPath];

    expect((await saga(['check', 'e2e', ...base, '--phase', 'plan'])).exitCode).toBe(0);
    const claim = JSON.parse((await saga(['claim', 'e2e', ...base, '--session', 'lead', '--json'])).stdout);
    const token = ['--token', claim.token];

    expect((await saga(['freeze', 'e2e', ...base, ...token])).exitCode).toBe(0);
    expect((await saga(['set-status', 'e2e', '--state', 'running', ...base, ...token])).exitCode).toBe(0);

    for (const id of ['T1', 'T2']) {
      writeProof(directory, id);
      expect((await saga(['tick', 'e2e', id, ...base, ...token])).exitCode).toBe(0);
    }

    expect((await saga(['amend', 'e2e', 'Stricter T1', 'Exit code two', ...base, ...token])).exitCode).toBe(0);
    expect((await saga(['freeze', 'e2e', ...base, ...token])).exitCode).toBe(EXIT_CODES.REFUSED);

    const amendment = path.join(directory, 'amendments', '001-stricter-t1.md');
    writeFileSync(amendment, readFileSync(amendment, 'utf8').replace('merged-in:', 'merged-in: r2'));
    writeFileSync(
      path.join(directory, 'acceptance.md'),
      '# Acceptance\n\n## T1\ncmd: node -e "process.exit(2)"\n\n## T2\ncmd: node -e "process.exit(0)"\n',
    );
    const reopened = await saga(['freeze', 'e2e', ...base, ...token, '--json']);
    expect(JSON.parse(reopened.stdout)).toMatchObject({ revision: 2, reopened: ['T1'] });
    expect(readFileSync(path.join(directory, 'progress.md'), 'utf8')).toContain('- [ ] T1 First item | reopened in r2');

    writeProof(directory, 'T1');
    expect((await saga(['tick', 'e2e', 'T1', ...base, ...token])).exitCode).toBe(0);
    expect((await saga(['set-status', 'e2e', '--state', 'done', ...base, ...token])).exitCode).toBe(0);
    expect((await saga(['release', 'e2e', ...base, ...token, '--workers-settled'])).exitCode).toBe(0);
    expect((await saga(['archive', 'e2e', ...base])).exitCode).toBe(0);
    expect(existsSync(directory)).toBe(false);
  }

  it('runs the whole lifecycle through hagi saga alone, with no installed tool', async () => {
    await runLifecycle();
  });
});

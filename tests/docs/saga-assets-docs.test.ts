import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../../src/main';
import { createDependencies } from '../commands/testHelpers';

const root = path.resolve(__dirname, '../..');
const read = (relative: string) => readFileSync(path.join(root, relative), 'utf8');
const readme = read('README.md');
const skillManifest = read('skills/hagi/SKILL.md');
const openaiMetadata = read('skills/hagi/agents/openai.yaml');
const cliUsage = read('skills/hagi/references/cli-usage.md');
const sagaReference = read('skills/hagi/references/saga.md');
const sessionData = read('skills/hagi/references/session-data.md');
const localDevelopment = read('skills/hagi/references/local-development.md');
const validation = read('skills/hagi/references/validation.md');
const packageJson = JSON.parse(read('package.json'));

describe('Saga asset maintenance guidance', () => {
  it('routes local Saga operations through the Hagi skill without losing existing guidance', () => {
    expect(skillManifest).toContain('local Saga initialization, creation, checks, writes, or read-only queries');
    expect(skillManifest).toContain('`saga init`, `saga new`, `saga list`, `saga status`, or `saga items`');
    expect(skillManifest).toContain('`references/saga.md`');
    expect(skillManifest).toContain('without reading backend configuration or calling the API');
    expect(skillManifest).toContain('`references/session-data.md`');
    expect(skillManifest).toContain('enable or disable a built-in skill');
    expect(skillManifest).toContain('`references/proposal-flow.md`');
    expect(skillManifest).toContain('Super Commit');
    expect(openaiMetadata).toContain('local Saga commands');
    expect(openaiMetadata).toContain('Saga init, new, list, status, or items commands');
  });

  it('documents the canonical source, raw bytes, and manifest contract', () => {
    expect(localDevelopment).toContain('../personal-agent-skills/long-running-orchestration/');
    expect(localDevelopment).toContain('resources/saga/');
    expect(localDevelopment).toContain('tools/saga.mjs');
    expect(localDevelopment).toContain('.gitignore');
    expect(localDevelopment).toContain('manifest.json');
    expect(localDevelopment).toMatch(/raw bytes.*do not render templates or normalize line endings/s);
    expect(localDevelopment).toMatch(/schema version `1`.*sorted POSIX.*SHA-256/s);
  });

  it('documents the registered offline synchronization and check commands', () => {
    for (const command of ['saga:assets:sync', 'saga:assets:check']) {
      expect(localDevelopment).toContain(`pnpm run ${command}`);
      expect(packageJson.scripts[command]).toContain('sync-saga-assets.mjs');
    }
    expect(packageJson.scripts['saga:assets:check']).toContain('--check');
    expect(validation).toContain('pnpm run saga:assets:check');
    expect(validation).toContain('pnpm run pack:check');
    expect(validation).toContain('hidden `.gitignore` template');
  });

  it('documents selector syntax, offline behavior, host-local paths, and npx caching in both user guides', () => {
    for (const documentation of [readme, cliUsage]) {
      expect(documentation).toContain('exactly one');
      expect(documentation).toContain('--path <directory>');
      expect(documentation).toContain('--project-id <id>');
      expect(documentation).toContain('machine running the CLI');
      expect(documentation).toContain('uncached');
      for (const command of [
        'hagi saga init --path "./My Project"',
        'hagi saga new demo --path "./My Project" --json',
        'hagi saga list --path "./My Project"',
        'hagi saga status demo --project-id <project-id> --json',
        'hagi saga items demo --path "./My Project" --json',
      ]) {
        expect(documentation).toContain(command);
      }
    }
    expect(readme).toContain('backend flags do not change local behavior');
    expect(cliUsage).toContain('does not read backend configuration or make API calls');
  });

  it('documents initialization outcomes, force behavior, ignore merging, and containment', () => {
    expect(readme).toContain('Conflicts exit with code `4`');
    expect(readme).toContain('`.gitignore` is always merged additively');
    expect(readme).toContain('redirected or unsafe targets');
    expect(readme).toContain('Saga command reference');

    for (const detail of [
      'missing nonconflicting resources are still',
      'with code `4` if any conflicts remain',
      '`created`, `unchanged`, `merged`, `replaced`, or `conflict`',
      'Use `--force` to replace differing managed resources',
      'never discards custom `.gitignore` entries',
      'LF and CRLF files are supported',
      'does not append duplicate rules',
      'regular files',
      'outside the selected project',
      'modes and modification times',
      'per-file `path`/`outcome` entries',
    ]) {
      expect(sagaReference).toContain(detail);
    }
    expect(sagaReference).toContain('hagi saga init --path "./My Project"');
    expect(sagaReference).toContain('hagi saga init --path "./My Project" --force --json');
  });

  it('documents canonical ID rules, collisions, and new-Saga metadata', () => {
    expect(sagaReference).toContain('hagi saga new demo --path "./My Project" --json');
    expect(sagaReference).toContain('^[a-z0-9][a-z0-9-]{0,62}$');
    for (const reserved of ['prompts', 'tools', 'archive', 'runtime', 'amendments', 'revisions']) {
      expect(sagaReference).toContain(`\`${reserved}\``);
    }
    expect(sagaReference).toMatch(/Invalid IDs are usage errors\s+\(code `2`\)/);
    expect(sagaReference).toContain('ends in `-<saga-id>`');
    expect(sagaReference).toContain('code `30`');
    expect(sagaReference).toContain('identifies the Saga directory and includes the metadata written to `saga.json`');
    expect(sagaReference).toMatch(/writes no runtime file and does not run the installed tool/);
    expect(sagaReference).toContain('node .hagicode/sagas/tools/saga.mjs instructions demo goal');

    const example = sagaReference.match(/```json\n([\s\S]*?)\n```/)?.[1];
    expect(example).toBeDefined();
    const result = JSON.parse(example ?? '');
    expect(Object.keys(result)).toEqual(['id', 'directory', 'metadata']);
    expect(result).toMatchObject({
      id: 'demo',
      directory: '/path/to/My Project/.hagicode/sagas/demo',
      metadata: { id: 'demo', method: 1 },
    });
    expect(result.metadata.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  });

  it('documents query payloads, observation timestamps, and read-only ownership', () => {
    for (const field of [
      'saga-status/2',
      'openAmendments',
      'nextArtifact',
      'updatedAt',
      'execution heartbeat',
      'runtime/status.json',
    ]) {
      expect(sagaReference).toContain(field);
    }
    expect(sagaReference).toMatch(/does not refresh or rewrite that stored status/);
    expect(sagaReference).toMatch(/strictly read-only.*do not initialize or repair resources/s);
    expect(sagaReference).toContain('or execute acceptance commands');
    expect(sagaReference).toMatch(/Every write and check command is implemented by the CLI.*never executes/s);

    for (const command of [
      'hagi saga list --project-id <project-id> --json',
      'hagi saga status <saga-id> --project-id <project-id> --json',
      'hagi saga items <saga-id> --project-id <project-id> --json',
    ]) {
      expect(sessionData).toContain(command);
    }
    expect(sessionData).toMatch(/without initializing or repairing them, refreshing runtime status,/);
    expect(sessionData).toMatch(/`updatedAt` is not the stored/);
    expect(sessionData).toMatch(/run either only\s+when the user explicitly asks/);
    expect(sessionData).toContain('Contract and lifecycle operations run through `hagi saga`');
  });

  it('matches documented subcommands and positional IDs to the registered help', async () => {
    const rootHelp = createDependencies();
    expect(await runCli(['node', 'hagi', 'saga', '--help'], rootHelp.dependencies)).toBe(0);
    for (const command of [
      'init', 'new', 'list', 'status', 'items',
      'claim', 'assert-owner', 'release', 'freeze', 'check', 'tick', 'block', 'set-status', 'amend', 'archive',
    ]) {
      expect(rootHelp.stdout.join('')).toContain(command);
    }

    for (const command of ['new', 'status', 'items']) {
      const help = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', command, '--help'], help.dependencies)).toBe(0);
      expect(help.stdout.join('')).toContain('<saga-id>');
    }
  });

  it('documents the write and check commands with token rules, exit codes, and parseable examples', async () => {
    for (const detail of [
      '`--token <token>`',
      '`SAGA_EXECUTION_TOKEN`',
      'rejected with `--project-id`',
      'exit code `1`',
      'Usage error',
      'runtime/execute.lock',
      'never taken over',
      '**/runtime/',
    ]) {
      expect(sagaReference.replace(/\s+/g, ' ')).toContain(detail.replace(/\s+/g, ' '));
    }
    for (const command of ['claim', 'assert-owner', 'release', 'freeze', 'check', 'tick', 'block', 'set-status', 'amend', 'archive']) {
      expect(sagaReference).toContain(`hagi saga ${command}`);
      const help = createDependencies();
      expect(await runCli(['node', 'hagi', 'saga', command, '--help'], help.dependencies)).toBe(0);
    }
  });
});

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const bundleRoot = fileURLToPath(new URL('../../../resources/saga/', import.meta.url));
const bundledPaths = [
  'prompts/goal.md',
  'prompts/research.md',
  'prompts/acceptance.md',
  'prompts/plan.md',
  'prompts/amend.md',
  'prompts/run.md',
  'install/gitignore.template',
];

function listFiles(directory: string, prefix = ''): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(directory, relativePath) : [relativePath];
  });
}

describe('bundled Saga assets', () => {
  it('contains the ignore rule, the six published methods, and no standalone tool', () => {
    expect(listFiles(bundleRoot).filter(file => file !== 'manifest.json').sort()).toEqual([...bundledPaths].sort());
  });

  it('keeps no dot-named ignore file in the bundle, because npm renames a packaged .gitignore on install', () => {
    const dotIgnoreFiles = listFiles(bundleRoot).filter(file => ['.gitignore', '.npmignore'].includes(path.posix.basename(file)));
    expect(dotIgnoreFiles).toEqual([]);
  });

  it('has the run prompt create Workers with hagi saga session create and no manual sessions.md append', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).toContain('hagi saga session create');
    expect(runPrompt).toContain('--role <role>');
    expect(runPrompt).toContain('SAGA_EXECUTION_TOKEN');
    expect(runPrompt).toContain('records each Worker session');
    expect(runPrompt).not.toContain('hagi chat create');
    expect(runPrompt).not.toContain('Append every session you create');
  });

  it('has the run prompt read quota with the bounded usage command before every Worker, and branch on guard.state and exit 34', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).toContain('hagi usage limits --wait-until-above <threshold> --provider <P> --max-wait 480 --json');
    expect(runPrompt).toContain('`guard.state`');
    expect(runPrompt).toContain('`ready`');
    expect(runPrompt).toContain('`low`');
    expect(runPrompt).toContain('exit `34`');
    expect(runPrompt).toContain('quota unknown');
    expect(runPrompt).toContain('Before each implementation, verification and tuning Worker');
  });

  it('has the run prompt bound the total quota wait per dispatch and pause with the provider, remaining percent and reset time', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).toContain('21600 seconds (six hours)');
    expect(runPrompt).toContain('pause the Saga instead');
    expect(runPrompt).toContain('its remaining percent and its `resetsAtUtc`');
  });

  it('has the run prompt resolve a provider per Worker from the hero hint, the role hint, then the default, verbatim', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).toContain('`<provider-hints>`');
    expect(runPrompt).toContain('the hint for the Worker\'s hero id');
    expect(runPrompt).toContain('the hint for the Worker\'s role');
    expect(runPrompt).toContain('the provider whose quota a Worker spends');
    expect(runPrompt).toContain('Use the provider id from the hint exactly as written');
    expect(runPrompt).toContain('Never translate an executor type name into a provider id');
  });

  it('has the run prompt re-dispatch a quota-failed Worker unchanged after a ready read of its own provider, and not count it', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).toContain('A quota fault does not count either');
    expect(runPrompt).toContain('the same instructions, unchanged');
    expect(runPrompt).toContain('the provider it used, not the default');
    expect(runPrompt).toContain('A real failure counts');
  });

  it('has the run prompt record the provider and reading in every heartbeat and dispatch line', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).toContain('Every dispatch line and every held dispatch line carries the quota reading');
    expect(runPrompt).toContain('the provider, the remaining percent, the `resetsAtUtc` and the seconds waited');
    expect(runPrompt).toContain('latest quota reading (provider, remaining percent, reset time and seconds waited)');
  });

  it('has every --max-wait in the run prompt be a finite number and no unbounded wait', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');
    const maxWaits = [...runPrompt.matchAll(/--max-wait (\S+)/g)].map(match => match[1]);

    expect(maxWaits.length).toBeGreaterThan(0);
    for (const value of maxWaits) {
      expect(value).toMatch(/^\d+$/);
    }
    expect(runPrompt).not.toMatch(/until (the )?quota returns|wait indefinitely|without a limit/i);
  });

  it('names no Token Monitor path, config file or credential in the run prompt', () => {
    const runPrompt = readFileSync(path.join(bundleRoot, 'prompts/run.md'), 'utf8');

    expect(runPrompt).not.toMatch(/config\.yaml|credential|Token Monitor/i);
  });

  it('uses schema 2 with exactly the install and method maps, each matching its bundled bytes', () => {
    const manifest = JSON.parse(readFileSync(path.join(bundleRoot, 'manifest.json'), 'utf8')) as {
      schemaVersion: number;
      install: Record<string, string>;
      methods: Record<string, string>;
    };
    expect(manifest.schemaVersion).toBe(2);
    expect(Object.keys(manifest).sort()).toEqual(['install', 'methods', 'schemaVersion']);
    expect(Object.keys(manifest.install)).toEqual(['install/gitignore.template']);
    expect(Object.keys(manifest.methods).sort()).toEqual(['acceptance', 'amend', 'goal', 'plan', 'research', 'run']);
    for (const [name, digest] of Object.entries(manifest.methods)) {
      expect(createHash('sha256').update(readFileSync(path.join(bundleRoot, 'prompts', `${name}.md`))).digest('hex')).toBe(digest);
    }
    for (const [name, digest] of Object.entries(manifest.install)) {
      expect(createHash('sha256').update(readFileSync(path.join(bundleRoot, name))).digest('hex')).toBe(digest);
    }
  });
});

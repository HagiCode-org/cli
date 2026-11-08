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

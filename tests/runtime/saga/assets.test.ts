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
  '.gitignore',
];

function listFiles(directory: string, prefix = ''): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(directory, relativePath) : [relativePath];
  });
}

describe('bundled Saga assets', () => {
  it('contains exactly the seven authoritative paths and no standalone tool', () => {
    expect(listFiles(bundleRoot).filter(file => !['manifest.json', '.npmignore'].includes(file)).sort()).toEqual([...bundledPaths].sort());
    expect(readFileSync(path.join(bundleRoot, '.npmignore'), 'utf8')).toBe('!.gitignore\n');
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

  it('matches every manifest hash byte for byte', () => {
    const manifest = JSON.parse(readFileSync(path.join(bundleRoot, 'manifest.json'), 'utf8')) as { files: Record<string, string> };
    expect(Object.keys(manifest.files).sort()).toEqual([...bundledPaths].sort());
    for (const bundlePath of bundledPaths) {
      const digest = createHash('sha256').update(readFileSync(path.join(bundleRoot, bundlePath))).digest('hex');
      expect(digest).toBe(manifest.files[bundlePath]);
    }
  });
});

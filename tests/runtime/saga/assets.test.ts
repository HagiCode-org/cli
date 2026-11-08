import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const bundleRoot = fileURLToPath(new URL('../../../resources/saga/', import.meta.url));
const sourceRoot = fileURLToPath(new URL('../../../../personal-agent-skills/long-running-orchestration/', import.meta.url));
const assets = [
  ['prompts/goal.md', 'templates/saga/prompts/goal.md'],
  ['prompts/research.md', 'templates/saga/prompts/research.md'],
  ['prompts/acceptance.md', 'templates/saga/prompts/acceptance.md'],
  ['prompts/plan.md', 'templates/saga/prompts/plan.md'],
  ['prompts/amend.md', 'templates/saga/prompts/amend.md'],
  ['prompts/run.md', 'templates/saga/prompts/run.md'],
  ['tools/saga.mjs', 'scripts/saga.mjs'],
  ['.gitignore', 'templates/saga/gitignore'],
] as const;

function listFiles(directory: string, prefix = ''): string[] {
  return readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(directory, relativePath) : [relativePath];
  });
}

describe('bundled Saga assets', () => {
  it('contains exactly the authoritative eight paths and preserves their bytes', () => {
    expect(listFiles(bundleRoot).filter(file => !['manifest.json', '.npmignore'].includes(file)).sort()).toEqual(assets.map(([bundlePath]) => bundlePath).sort());
    expect(readFileSync(path.join(bundleRoot, '.npmignore'), 'utf8')).toBe('!.gitignore\n');

    for (const [bundlePath, sourcePath] of assets) {
      expect(readFileSync(path.join(bundleRoot, bundlePath)).equals(readFileSync(path.join(sourceRoot, sourcePath)))).toBe(true);
    }
  });
});

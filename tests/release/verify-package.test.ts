import { describe, expect, it } from 'vitest';
import {
  getAllowedPublishEntries,
  getRequiredPublishFiles,
  isAllowedBundledFile,
  inspectPackedFiles,
} from '../../scripts/verify-package.mjs';

const manifest = {
  name: '@hagicode/cli',
  main: './dist/main.js',
  bin: {
    hagi: './dist/cli.js',
  },
  files: ['dist', 'README.md', 'resources/saga'],
};
const sagaResources = [
  'resources/saga/.gitignore',
  'resources/saga/manifest.json',
  'resources/saga/prompts/acceptance.md',
  'resources/saga/prompts/amend.md',
  'resources/saga/prompts/goal.md',
  'resources/saga/prompts/plan.md',
  'resources/saga/prompts/research.md',
  'resources/saga/prompts/run.md',
];

describe('verify-package', () => {
  it('derives the required and allowed publish entries from the manifest', () => {
    expect(getRequiredPublishFiles(manifest)).toEqual(['README.md', 'dist/main.js', 'dist/cli.js', ...sagaResources]);
    expect(getAllowedPublishEntries(manifest)).toEqual([
      'README.md',
      'dist/main.js',
      'dist/cli.js',
      ...sagaResources,
      'dist/chunks/*.js',
    ]);
  });

  it('accepts the intended packed files only', () => {
    expect(
      inspectPackedFiles(manifest, [
        'package.json',
        'README.md',
        'dist/cli.js',
        'dist/main.js',
        'dist/chunks/shared-runtime.js',
        ...sagaResources,
      ]),
    ).toMatchObject({
      missingFiles: [],
      unexpectedFiles: [],
    });
  });

  it('accepts only required entrypoints and approved shared chunks', () => {
    expect(isAllowedBundledFile('dist/cli.js', manifest)).toBe(true);
    expect(isAllowedBundledFile('dist/main.js', manifest)).toBe(true);
    expect(isAllowedBundledFile('dist/chunks/runtime-abc123.js', manifest)).toBe(true);
    expect(isAllowedBundledFile('dist/chunks/runtime-abc123.js.map', manifest)).toBe(false);
  });

  it('allows the skills directory only when the manifest publishes it', () => {
    const withSkills = { ...manifest, files: ['dist', 'README.md', 'skills'] };

    expect(getAllowedPublishEntries(withSkills)).toContain('skills/**');
    expect(isAllowedBundledFile('skills/hagi/SKILL.md', withSkills)).toBe(true);
    expect(isAllowedBundledFile('skills/hagi/references/cli-usage.md', withSkills)).toBe(true);
    expect(isAllowedBundledFile('skills/hagi/SKILL.md', manifest)).toBe(false);
    expect(getAllowedPublishEntries(manifest)).not.toContain('skills/**');
    expect(
      inspectPackedFiles(withSkills, [
        'package.json',
        'README.md',
        'dist/cli.js',
        'dist/main.js',
        'skills/hagi/SKILL.md',
      ]),
    ).toMatchObject({ missingFiles: [], unexpectedFiles: [] });
    expect(
      inspectPackedFiles(manifest, ['package.json', 'README.md', 'dist/cli.js', 'dist/main.js', 'skills/hagi/SKILL.md']),
    ).toMatchObject({ unexpectedFiles: ['skills/hagi/SKILL.md'] });
  });

  it('allows only fixed Saga resource files when the manifest publishes them', () => {
    for (const resource of sagaResources) {
      expect(isAllowedBundledFile(resource, manifest)).toBe(true);
    }
    expect(isAllowedBundledFile('resources/saga/prompts/extra.md', manifest)).toBe(false);
    expect(isAllowedBundledFile('resources/saga/README.md', manifest)).toBe(false);
    expect(isAllowedBundledFile('resources/saga/tools/saga.mjs.map', manifest)).toBe(false);

    const withoutSagaResources = { ...manifest, files: ['dist', 'README.md'] };
    expect(isAllowedBundledFile('resources/saga/tools/saga.mjs', withoutSagaResources)).toBe(false);
    expect(getRequiredPublishFiles(withoutSagaResources)).not.toContain('resources/saga/.gitignore');
  });

  it('rejects a packed standalone Saga tool and its source map by name', () => {
    const base = ['package.json', 'README.md', 'dist/cli.js', 'dist/main.js', ...sagaResources];
    expect(
      inspectPackedFiles(manifest, [...base, 'resources/saga/tools/saga.mjs', 'resources/saga/tools/saga.mjs.map']),
    ).toMatchObject({
      missingFiles: [],
      unexpectedFiles: ['resources/saga/tools/saga.mjs', 'resources/saga/tools/saga.mjs.map'],
    });
  });

  it('reports a missing managed Saga resource by name', () => {
    const packed = ['package.json', 'README.md', 'dist/cli.js', 'dist/main.js', ...sagaResources]
      .filter(file => file !== 'resources/saga/prompts/goal.md');
    expect(inspectPackedFiles(manifest, packed)).toMatchObject({
      missingFiles: ['resources/saga/prompts/goal.md'],
      unexpectedFiles: [],
    });
  });

  it('passes a clean package that contains only the managed Saga resources', () => {
    const packed = ['package.json', 'README.md', 'dist/cli.js', 'dist/main.js', ...sagaResources];
    expect(inspectPackedFiles(manifest, packed)).toMatchObject({ missingFiles: [], unexpectedFiles: [] });
  });

  it('reports missing entrypoints and unexpected files', () => {
    const withoutSagaResources = { ...manifest, files: ['dist', 'README.md'] };
    expect(
      inspectPackedFiles(withoutSagaResources, [
        'package.json',
        'README.md',
        'dist/cli.js',
        'dist/runtime/apiRuntime.js',
        'dist/chunks/runtime-abc123.js.map',
      ]),
    ).toMatchObject({
      missingFiles: ['dist/main.js'],
      unexpectedFiles: ['dist/chunks/runtime-abc123.js.map', 'dist/runtime/apiRuntime.js'],
    });
  });
});

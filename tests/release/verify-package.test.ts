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
  files: ['dist', 'README.md'],
};

describe('verify-package', () => {
  it('derives the required and allowed publish entries from the manifest', () => {
    expect(getRequiredPublishFiles(manifest)).toEqual(['README.md', 'dist/main.js', 'dist/cli.js']);
    expect(getAllowedPublishEntries(manifest)).toEqual([
      'README.md',
      'dist/main.js',
      'dist/cli.js',
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

  it('reports missing entrypoints and unexpected files', () => {
    expect(
      inspectPackedFiles(manifest, [
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

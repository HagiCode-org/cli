import { describe, expect, it } from 'vitest';
import {
  getAllowedPublishEntries,
  getRequiredPublishFiles,
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
      'dist',
    ]);
  });

  it('accepts the intended packed files only', () => {
    expect(
      inspectPackedFiles(manifest, [
        'package.json',
        'README.md',
        'dist/cli.js',
        'dist/main.js',
        'dist/runtime/apiRuntime.js',
      ]),
    ).toMatchObject({
      missingFiles: [],
      unexpectedFiles: [],
    });
  });

  it('reports missing entrypoints and unexpected files', () => {
    expect(
      inspectPackedFiles(manifest, [
        'package.json',
        'README.md',
        'dist/cli.js',
        'src/cli.ts',
      ]),
    ).toMatchObject({
      missingFiles: ['dist/main.js'],
      unexpectedFiles: ['src/cli.ts'],
    });
  });
});

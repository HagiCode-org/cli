import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseBaseVersion,
  readPackageVersion,
  resolveDevelopmentVersion,
} from '../../scripts/resolve-dev-version.mjs';

const tempDirs: string[] = [];

function createPackageJson(version: string) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hagi-cli-dev-version-'));
  tempDirs.push(tempDir);

  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    `${JSON.stringify({ name: '@hagicode/cli', version }, null, 2)}\n`,
  );

  return tempDir;
}

afterEach(() => {
  for (const tempDir of tempDirs.splice(0)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe('resolve-dev-version', () => {
  it('reduces package versions to their stable base', () => {
    expect(parseBaseVersion('1.2.3')).toBe('1.2.3');
    expect(parseBaseVersion('1.2.3-beta.4+build.9')).toBe('1.2.3');
    expect(() => parseBaseVersion('next')).toThrow('valid semver');
  });

  it('reads the package version from package.json', () => {
    const tempDir = createPackageJson('2.4.6');

    expect(readPackageVersion(path.join(tempDir, 'package.json'))).toBe('2.4.6');
  });

  it('derives a unique development prerelease version from GitHub metadata', () => {
    expect(
      resolveDevelopmentVersion({
        packageVersion: '0.1.0',
        runNumber: '42',
        runAttempt: '3',
        sha: 'ABCDEF1234567890',
      }),
    ).toBe('0.1.0-dev.42.3.abcdef1');
  });

  it('rejects invalid GitHub run metadata', () => {
    expect(() =>
      resolveDevelopmentVersion({
        packageVersion: '0.1.0',
        runNumber: 'forty-two',
        runAttempt: '1',
        sha: 'abcdef1',
      }),
    ).toThrow('GITHUB_RUN_NUMBER must be numeric');
  });
});

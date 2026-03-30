import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  parseStableTag,
  resolveReleaseTag,
  verifyReleaseVersion,
} from '../../scripts/verify-release-version.mjs';

const tempDirs: string[] = [];

function createPackageJson(version: string) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hagi-cli-release-version-'));
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

describe('verify-release-version', () => {
  it('parses strict stable tags only', () => {
    expect(parseStableTag('v1.2.3')).toBe('1.2.3');
    expect(() => parseStableTag('v1.2.3-beta.1')).toThrow('stable vX.Y.Z format');
    expect(() => parseStableTag('1.2.3')).toThrow('stable vX.Y.Z format');
  });

  it('resolves tags from CLI args, environment, and GitHub event payloads', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hagi-cli-release-event-'));
    tempDirs.push(tempDir);

    const eventPath = path.join(tempDir, 'event.json');
    fs.writeFileSync(eventPath, JSON.stringify({ release: { tag_name: 'v2.0.0' } }));

    expect(resolveReleaseTag({ cliTag: 'v3.0.0', env: {} })).toBe('v3.0.0');
    expect(resolveReleaseTag({ env: { RELEASE_TAG_NAME: 'v4.0.0' } })).toBe('v4.0.0');
    expect(resolveReleaseTag({ env: {}, eventPath })).toBe('v2.0.0');
  });

  it('fails when the stable tag does not match package.json', () => {
    const tempDir = createPackageJson('1.2.4');

    expect(() =>
      verifyReleaseVersion({
        tagName: 'v1.2.3',
        packageJsonPath: path.join(tempDir, 'package.json'),
      }),
    ).toThrow('Tag v1.2.3 does not match package.json version 1.2.4.');
  });

  it('returns the resolved version for matching tags', () => {
    const tempDir = createPackageJson('1.2.3');

    expect(
      verifyReleaseVersion({
        tagName: 'v1.2.3',
        packageJsonPath: path.join(tempDir, 'package.json'),
      }),
    ).toMatchObject({
      tagName: 'v1.2.3',
      version: '1.2.3',
    });
  });
});

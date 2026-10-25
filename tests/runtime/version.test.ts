import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CLI_CLIENT_MARKER, formatCliClientMarker } from '../../src/runtime/version';

describe('CLI client marker', () => {
  it('equals cli/ followed by the package.json version', () => {
    const packageJson = JSON.parse(readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'));

    expect(CLI_CLIENT_MARKER).toBe(`cli/${packageJson.version}`);
  });

  it('falls back to cli/unknown when the define is absent', () => {
    expect(formatCliClientMarker(undefined)).toBe('cli/unknown');
  });
});

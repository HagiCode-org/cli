import { describe, expect, it } from 'vitest';
import {
  collectOptionValue,
  normalizeRepositoryPath,
  writeMonoSpecsDocument,
} from '../../src/commands/project/monospecs/shared';
import type { CommandContext } from '../../src/runtime/commandContext';
import { CliUsageError } from '../../src/runtime/errors';
import { createMonoSpecsDocument } from './testHelpers';

function createContext(outputJson: boolean) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const context = {
    api: {},
    env: {},
    io: { stdout: (value: string) => stdout.push(value), stderr: (value: string) => stderr.push(value) },
    outputJson,
    runtime: {},
  } as unknown as CommandContext;

  return { context, stdout, stderr };
}

describe('collectOptionValue', () => {
  it('appends the new value after the earlier ones', () => {
    expect(collectOptionValue('b', ['a'])).toEqual(['a', 'b']);
  });

  it('starts a list from an empty accumulator', () => {
    expect(collectOptionValue('only', [])).toEqual(['only']);
  });

  it('does not mutate the previous list', () => {
    const previous = ['a'];

    const next = collectOptionValue('b', previous);

    expect(previous).toEqual(['a']);
    expect(next).not.toBe(previous);
  });

  it('keeps duplicates and empty strings as given', () => {
    expect(collectOptionValue('a', ['a', ''])).toEqual(['a', '', 'a']);
  });
});

describe('normalizeRepositoryPath', () => {
  it('returns a clean relative path unchanged', () => {
    expect(normalizeRepositoryPath('repos/web')).toBe('repos/web');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeRepositoryPath('  repos/web \n')).toBe('repos/web');
  });

  it('turns backslashes into forward slashes', () => {
    expect(normalizeRepositoryPath('repos\\web\\app')).toBe('repos/web/app');
  });

  it('drops one or several leading ./ segments', () => {
    expect(normalizeRepositoryPath('./repos/web')).toBe('repos/web');
    expect(normalizeRepositoryPath('./././repos/web')).toBe('repos/web');
    expect(normalizeRepositoryPath('.\\repos\\web')).toBe('repos/web');
  });

  it('drops trailing slashes', () => {
    expect(normalizeRepositoryPath('repos/web/')).toBe('repos/web');
    expect(normalizeRepositoryPath('repos/web///')).toBe('repos/web');
    expect(normalizeRepositoryPath('repos\\web\\')).toBe('repos/web');
  });

  it('keeps inner ./ segments and dot-directories that are part of a name', () => {
    expect(normalizeRepositoryPath('repos/./web')).toBe('repos/./web');
    expect(normalizeRepositoryPath('.hidden/repo')).toBe('.hidden/repo');
  });

  it.each([
    ['an empty string', ''],
    ['only whitespace', '   '],
    ['a single dot', '.'],
    ['a dot with a trailing slash', './'],
    ['only slashes', '///'],
    ['a dot surrounded by whitespace', ' . '],
  ])('rejects %s as a usage error', (_label, value) => {
    expect(() => normalizeRepositoryPath(value)).toThrow(CliUsageError);
  });

  it('quotes the original input in the usage error message', () => {
    expect(() => normalizeRepositoryPath('  ./ ')).toThrow(
      'Repository path must name a directory below the project root: "  ./ ".',
    );
  });
});

describe('writeMonoSpecsDocument', () => {
  it('writes the payload as pretty JSON with a trailing newline in JSON mode', () => {
    const { context, stdout } = createContext(true);

    writeMonoSpecsDocument(context, createMonoSpecsDocument());

    expect(stdout).toHaveLength(1);
    expect(stdout[0]!.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(stdout[0]!) as Record<string, unknown>;
    expect(parsed).toMatchObject({ version: '1.0', repoDirectory: 'repos', configPath: '/tmp/project/monospecs.yaml' });
  });

  it('ignores the heading and yaml options in JSON mode', () => {
    const { context, stdout } = createContext(true);
    const { context: plainContext, stdout: plainStdout } = createContext(true);

    writeMonoSpecsDocument(context, createMonoSpecsDocument(), { heading: 'Ignored.', yaml: true });
    writeMonoSpecsDocument(plainContext, createMonoSpecsDocument());

    expect(stdout).toEqual(plainStdout);
    expect(stdout[0]).not.toContain('Ignored.');
  });

  it('prints the human summary without a heading by default', () => {
    const { context, stdout } = createContext(false);

    writeMonoSpecsDocument(context, createMonoSpecsDocument());

    expect(stdout).toHaveLength(1);
    expect(stdout[0]).toContain('configPath');
    expect(stdout[0]).toContain('/tmp/project/monospecs.yaml');
    expect(stdout[0]).toContain('repos/cli');
    expect(stdout[0]).not.toContain('YAML');
    expect(stdout[0]!.startsWith('{')).toBe(false);
  });

  it('puts the heading on its own line before the summary', () => {
    const { context, stdout } = createContext(false);

    writeMonoSpecsDocument(context, createMonoSpecsDocument(), { heading: 'MonoSpecs configuration reloaded.' });

    expect(stdout[0]!.startsWith('MonoSpecs configuration reloaded.\n')).toBe(true);
    expect(stdout[0]).toContain('configPath');
  });

  it('appends the YAML preview when yaml is requested', () => {
    const { context, stdout } = createContext(false);

    writeMonoSpecsDocument(context, createMonoSpecsDocument({ yamlPreview: 'version: "1.0"\n' }), { yaml: true });

    expect(stdout[0]).toContain('\nYAML\nversion: "1.0"\n');
  });

  it('states that no repositories are listed for an empty document', () => {
    const { context, stdout } = createContext(false);

    writeMonoSpecsDocument(context, createMonoSpecsDocument({ repositories: [] }));

    expect(stdout[0]).toContain('This document lists no repositories.');
  });

  it('writes nothing to stderr', () => {
    const { context, stderr } = createContext(false);

    writeMonoSpecsDocument(context, createMonoSpecsDocument(), { heading: 'Done.' });

    expect(stderr).toEqual([]);
  });
});

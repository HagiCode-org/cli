import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliSagaRefusalError } from '../../../src/runtime/errors';
import { appendContained } from '../../../src/runtime/saga/safeWrite';

let workspace: string;
let sagaRoot: string;
let recordPath: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-append-')));
  sagaRoot = path.join(workspace, '.hagicode', 'sagas');
  mkdirSync(path.join(sagaRoot, 'demo', 'runtime'), { recursive: true });
  recordPath = path.join(sagaRoot, 'demo', 'runtime', 'sessions.md');
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('appendContained', () => {
  it('creates the file when it is missing and writes the text as given', () => {
    appendContained(sagaRoot, recordPath, '- s1 | t | worker\n');

    expect(readFileSync(recordPath, 'utf8')).toBe('- s1 | t | worker\n');
  });

  it('keeps earlier bytes and appends after a final newline without adding one', () => {
    writeFileSync(recordPath, '# Sessions\n- a\n');

    appendContained(sagaRoot, recordPath, '- b\n');

    expect(readFileSync(recordPath, 'utf8')).toBe('# Sessions\n- a\n- b\n');
  });

  it('adds one newline first when the non-empty file lacks a final newline, and keeps the earlier bytes', () => {
    writeFileSync(recordPath, '# Sessions\n- a');

    appendContained(sagaRoot, recordPath, '- b\n');

    expect(readFileSync(recordPath, 'utf8')).toBe('# Sessions\n- a\n- b\n');
  });

  it('does not add a separator to an empty existing file', () => {
    writeFileSync(recordPath, '');

    appendContained(sagaRoot, recordPath, '- b\n');

    expect(readFileSync(recordPath, 'utf8')).toBe('- b\n');
  });

  it('refuses a symbolic link as the target and leaves the external file unchanged', () => {
    const outside = path.join(workspace, 'outside.md');
    writeFileSync(outside, 'original\n');
    symlinkSync(outside, recordPath, 'file');

    expect(() => appendContained(sagaRoot, recordPath, '- b\n')).toThrow(CliSagaRefusalError);
    expect(readFileSync(outside, 'utf8')).toBe('original\n');
  });

  it('refuses a redirected runtime directory and creates nothing outside the Saga root', () => {
    const outside = path.join(workspace, 'outside');
    mkdirSync(outside);
    rmSync(path.join(sagaRoot, 'demo', 'runtime'), { recursive: true, force: true });
    symlinkSync(outside, path.join(sagaRoot, 'demo', 'runtime'), 'dir');

    expect(() => appendContained(sagaRoot, recordPath, '- b\n')).toThrow(CliSagaRefusalError);
    expect(readdirSync(outside)).toEqual([]);
  });

  it('refuses a target outside the Saga root', () => {
    expect(() => appendContained(sagaRoot, path.join(workspace, 'elsewhere.md'), 'x\n')).toThrow(CliSagaRefusalError);
  });
});

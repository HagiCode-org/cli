import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CliOperationFailedError, CliSagaRefusalError } from '../../../src/runtime/errors';
import {
  assertContained,
  ensureRuntimeIgnore,
  moveDirectory,
  writeFileAtomic,
  writeFileExclusive,
  writeJsonAtomic,
} from '../../../src/runtime/saga/safeWrite';

let workspace: string;
let sagaRoot: string;

beforeEach(() => {
  workspace = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-safe-write-')));
  sagaRoot = path.join(workspace, '.hagicode', 'sagas');
  mkdirSync(path.join(sagaRoot, 'demo'), { recursive: true });
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

describe('safeWrite primitives', () => {
  it('refuses a runtime directory that is a link outside the Saga root and leaves the external directory unchanged', () => {
    const outside = path.join(workspace, 'outside');
    mkdirSync(outside);
    writeFileSync(path.join(outside, 'status.json'), 'original');
    symlinkSync(outside, path.join(sagaRoot, 'demo', 'runtime'), 'dir');

    expect(() => writeJsonAtomic(sagaRoot, path.join(sagaRoot, 'demo', 'runtime', 'status.json'), { ok: true }))
      .toThrow(CliSagaRefusalError);
    expect(readFileSync(path.join(outside, 'status.json'), 'utf8')).toBe('original');
    expect(readdirSync(outside)).toEqual(['status.json']);
  });

  it('removes its temporary file when the atomic replace fails', () => {
    // A directory at the target makes the rename fail after the temporary file was written.
    mkdirSync(path.join(sagaRoot, 'demo', 'progress.md'));

    expect(() => writeFileAtomic(sagaRoot, path.join(sagaRoot, 'demo', 'progress.md'), 'content')).toThrow();
    expect(readdirSync(path.join(sagaRoot, 'demo'))).toEqual(['progress.md']);
  });

  it('replaces a file atomically and leaves no temporary file behind', () => {
    const target = path.join(sagaRoot, 'demo', 'status.json');
    writeJsonAtomic(sagaRoot, target, { state: 'paused' });
    expect(JSON.parse(readFileSync(target, 'utf8'))).toEqual({ state: 'paused' });
    expect(readdirSync(path.join(sagaRoot, 'demo')).filter(name => name.endsWith('.tmp'))).toEqual([]);
  });

  it('creates files exclusively and rejects a second creation of the same file', () => {
    const target = path.join(sagaRoot, 'demo', 'execute.lock');
    writeFileExclusive(sagaRoot, target, 'first');
    expect(() => writeFileExclusive(sagaRoot, target, 'second')).toThrow(/EEXIST/);
    expect(readFileSync(target, 'utf8')).toBe('first');
  });

  it('rejects traversal out of the Saga root before touching any file', () => {
    const outsideTarget = path.join(sagaRoot, '..', 'escape.json');
    expect(() => assertContained(sagaRoot, outsideTarget)).toThrow(CliSagaRefusalError);
    expect(() => writeJsonAtomic(sagaRoot, outsideTarget, {})).toThrow(CliSagaRefusalError);
    expect(existsSync(path.join(workspace, '.hagicode', 'escape.json'))).toBe(false);
  });

  it('refuses to move a directory onto an existing destination', () => {
    mkdirSync(path.join(sagaRoot, 'archive', 'taken'), { recursive: true });
    expect(() => moveDirectory(sagaRoot, path.join(sagaRoot, 'demo'), path.join(sagaRoot, 'archive', 'taken')))
      .toThrow(CliSagaRefusalError);
    expect(existsSync(path.join(sagaRoot, 'demo'))).toBe(true);
  });
});

describe('ensureRuntimeIgnore', () => {
  const ignorePath = () => path.join(sagaRoot, '.gitignore');

  it('creates the ignore file with the runtime rule when it is missing', () => {
    ensureRuntimeIgnore(sagaRoot);
    expect(readFileSync(ignorePath(), 'utf8')).toBe('**/runtime/\n');
  });

  it('leaves the bytes unchanged when a runtime rule already exists', () => {
    writeFileSync(ignorePath(), 'node_modules/\n*/runtime/\n');
    ensureRuntimeIgnore(sagaRoot);
    expect(readFileSync(ignorePath(), 'utf8')).toBe('node_modules/\n*/runtime/\n');
  });

  it('accepts the double-star rule as an existing runtime rule', () => {
    writeFileSync(ignorePath(), '**/runtime/');
    ensureRuntimeIgnore(sagaRoot);
    expect(readFileSync(ignorePath(), 'utf8')).toBe('**/runtime/');
  });

  it('adds a line break before the rule when the file has no trailing newline', () => {
    writeFileSync(ignorePath(), 'node_modules/');
    ensureRuntimeIgnore(sagaRoot);
    expect(readFileSync(ignorePath(), 'utf8')).toBe('node_modules/\n**/runtime/\n');
  });

  it('keeps CRLF line endings when appending the rule', () => {
    writeFileSync(ignorePath(), 'node_modules/\r\ndist/\r\n');
    ensureRuntimeIgnore(sagaRoot);
    expect(readFileSync(ignorePath(), 'utf8')).toBe('node_modules/\r\ndist/\r\n**/runtime/\r\n');
  });

  it('fails with an operation error when the ignore file cannot be read or written', () => {
    // A directory where the ignore file should be cannot be read as text or appended to.
    mkdirSync(ignorePath());
    expect(() => ensureRuntimeIgnore(sagaRoot)).toThrow(CliOperationFailedError);
    expect(existsSync(path.join(sagaRoot, 'demo', 'runtime'))).toBe(false);
  });
});

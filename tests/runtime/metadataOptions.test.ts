import { describe, expect, it, vi } from 'vitest';
import { CliUsageError } from '../../src/runtime/errors';
import { resolveMetadataOptions, topLevelJsonKeys, type MetadataSources } from '../../src/runtime/metadataOptions';

function sources(files: Record<string, string> = {}, stdin = ''): MetadataSources {
  return {
    readFile: vi.fn((path: string) => {
      if (!(path in files)) {
        throw new Error(`ENOENT: no such file ${path}`);
      }
      return files[path];
    }),
    readStdin: vi.fn(() => stdin),
  };
}

function usageMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(CliUsageError);
    return (error as Error).message;
  }
  throw new Error('expected a usage error');
}

describe('resolveMetadataOptions', () => {
  it('returns undefined when no entry is given', () => {
    expect(resolveMetadataOptions({ entries: [], jsonSources: [] }, sources())).toBeUndefined();
    expect(resolveMetadataOptions({}, sources())).toBeUndefined();
  });

  it('splits each entry at the first equals sign', () => {
    expect(resolveMetadataOptions({ entries: ['role=master', 'batch=3'] }, sources())).toEqual({
      role: 'master',
      batch: '3',
    });
  });

  it('keeps equals signs inside the value', () => {
    expect(resolveMetadataOptions({ entries: ['note=a=b'] }, sources())).toEqual({ note: 'a=b' });
  });

  it('allows an empty value, which the backend then judges', () => {
    expect(resolveMetadataOptions({ entries: ['note='] }, sources())).toEqual({ note: '' });
  });

  it('rejects an entry without an equals sign', () => {
    expect(usageMessage(() => resolveMetadataOptions({ entries: ['role'] }, sources()))).toContain('key=value');
  });

  it('rejects an entry with an empty key', () => {
    expect(usageMessage(() => resolveMetadataOptions({ entries: ['=x'] }, sources()))).toContain('key is empty');
  });

  it('rejects a key given twice in the options', () => {
    expect(usageMessage(() => resolveMetadataOptions({ entries: ['role=a', 'role=b'] }, sources()))).toContain(
      'Metadata key "role" is given more than once',
    );
  });

  it('reads a JSON object from a file', () => {
    const fake = sources({ '/work/meta.json': '{"role":"worker","master":"abc"}' });
    expect(resolveMetadataOptions({ jsonSources: ['/work/meta.json'] }, fake)).toEqual({ role: 'worker', master: 'abc' });
    expect(fake.readFile).toHaveBeenCalledWith('/work/meta.json');
    expect(fake.readStdin).not.toHaveBeenCalled();
  });

  it('reads a JSON object from stdin when the source is a dash', () => {
    const fake = sources({}, '{"role":"master"}');
    expect(resolveMetadataOptions({ jsonSources: ['-'] }, fake)).toEqual({ role: 'master' });
    expect(fake.readStdin).toHaveBeenCalledTimes(1);
    expect(fake.readFile).not.toHaveBeenCalled();
  });

  it('merges the options and the JSON source when their keys differ', () => {
    const fake = sources({}, '{"master":"abc"}');
    expect(resolveMetadataOptions({ entries: ['role=worker'], jsonSources: ['-'] }, fake)).toEqual({
      role: 'worker',
      master: 'abc',
    });
  });

  it('merges several JSON sources', () => {
    const fake = sources({ 'a.json': '{"a":"1"}', 'b.json': '{"b":"2"}' });
    expect(resolveMetadataOptions({ jsonSources: ['a.json', 'b.json'] }, fake)).toEqual({ a: '1', b: '2' });
  });

  it('rejects a key present in both the options and the JSON', () => {
    const fake = sources({}, '{"role":"worker"}');
    expect(usageMessage(() => resolveMetadataOptions({ entries: ['role=master'], jsonSources: ['-'] }, fake))).toContain(
      'Metadata key "role" is given more than once',
    );
  });

  it('rejects a key repeated inside one JSON object', () => {
    const fake = sources({}, '{"role":"a","role":"b"}');
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['-'] }, fake))).toContain(
      'Metadata key "role" is given more than once in --metadata-json stdin',
    );
  });

  it('rejects a key repeated across two JSON sources', () => {
    const fake = sources({ 'a.json': '{"role":"a"}', 'b.json': '{"role":"b"}' });
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['a.json', 'b.json'] }, fake))).toContain(
      'Metadata key "role" is given more than once',
    );
  });

  it('rejects JSON text that is not valid', () => {
    const fake = sources({}, '{"role":');
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['-'] }, fake))).toContain('is not valid JSON');
  });

  it.each([
    ['an array', '["role"]'],
    ['a string', '"role"'],
    ['null', 'null'],
    ['a number', '42'],
  ])('rejects JSON that is %s rather than an object', (_label, text) => {
    const fake = sources({}, text);
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['-'] }, fake))).toContain('must be a JSON object');
  });

  it.each([
    ['a number', '{"count":3}'],
    ['a boolean', '{"count":true}'],
    ['null', '{"count":null}'],
    ['a nested object', '{"count":{"n":1}}'],
  ])('rejects a value that is %s', (_label, text) => {
    const fake = sources({}, text);
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['-'] }, fake))).toContain('the value of "count" must be a string');
  });

  it('rejects an empty key in the JSON object', () => {
    const fake = sources({}, '{"":"x"}');
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['-'] }, fake))).toContain('has an empty key');
  });

  it('reports an unreadable file as a usage error', () => {
    expect(usageMessage(() => resolveMetadataOptions({ jsonSources: ['missing.json'] }, sources()))).toContain(
      'Could not read --metadata-json missing.json',
    );
  });

  it('accepts a byte order mark before the JSON text', () => {
    const fake = sources({}, '﻿{"role":"master"}');
    expect(resolveMetadataOptions({ jsonSources: ['-'] }, fake)).toEqual({ role: 'master' });
  });

  it('keeps a value that is a string of JSON text unchanged', () => {
    const fake = sources({}, '{"note":"{\\"x\\":1}"}');
    expect(resolveMetadataOptions({ jsonSources: ['-'] }, fake)).toEqual({ note: '{"x":1}' });
  });
});

describe('topLevelJsonKeys', () => {
  it('lists root keys in order with repeats, and ignores nested keys', () => {
    expect(topLevelJsonKeys('{"a":{"a":"x"},"b":"1","a":"2"}')).toEqual(['a', 'b', 'a']);
  });

  it('does not count a string value that looks like a key', () => {
    expect(topLevelJsonKeys('{"a":"b\\":\\"c","d":"e"}')).toEqual(['a', 'd']);
  });
});

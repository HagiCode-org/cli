import { describe, expect, it } from 'vitest';
import { buildWorkerMetadata, formatSessionRecordLine } from '../../../src/runtime/saga/sessionRecord';

const METADATA_KEY_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;

describe('buildWorkerMetadata', () => {
  it('builds exactly five saga.* entries when an item is given', () => {
    const metadata = buildWorkerMetadata({ sagaId: 'demo', role: 'implementation', masterSessionId: 'm-1', item: 'T1' });

    expect(metadata).toEqual({
      'saga.id': 'demo',
      'saga.role': 'worker',
      'saga.worker': 'implementation',
      'saga.master': 'm-1',
      'saga.item': 'T1',
    });
  });

  it('builds exactly four entries and no saga.item key without an item', () => {
    const metadata = buildWorkerMetadata({ sagaId: 'demo', role: 'verification', masterSessionId: 'm-1' });

    expect(Object.keys(metadata)).toEqual(['saga.id', 'saga.role', 'saga.worker', 'saga.master']);
    expect(metadata).not.toHaveProperty('saga.item');
  });

  it('keeps every key within the backend key format and the entry limit of 5', () => {
    const withItem = buildWorkerMetadata({ sagaId: 'demo', role: 'implementation', masterSessionId: 'm-1', item: 'T1' });
    for (const key of Object.keys(withItem)) {
      expect(key).toMatch(METADATA_KEY_PATTERN);
    }
    expect(Object.keys(withItem).length).toBeLessThanOrEqual(5);
  });
});

describe('formatSessionRecordLine', () => {
  it('writes the record with an item', () => {
    const line = formatSessionRecordLine({
      sessionId: 'sess-1',
      role: 'implementation',
      item: 'T1',
      title: 'T1 implementation',
      createdAt: '2026-11-08T10:00:00Z',
    });

    expect(line).toBe('- sess-1 | 2026-11-08T10:00:00Z | implementation | T1 | T1 implementation\n');
  });

  it('writes "-" in place of the item when none is given', () => {
    const line = formatSessionRecordLine({
      sessionId: 'sess-2',
      role: 'verification',
      title: 'Check',
      createdAt: '2026-11-08T10:00:00Z',
    });

    expect(line).toBe('- sess-2 | 2026-11-08T10:00:00Z | verification | - | Check\n');
  });

  it('collapses a multi-line title into one line', () => {
    const line = formatSessionRecordLine({
      sessionId: 'sess-3',
      role: 'implementation',
      item: 'T2',
      title: '  first line\r\n\tsecond   line\nthird  ',
      createdAt: '2026-11-08T10:00:00Z',
    });

    expect(line.split('\n')).toEqual([
      '- sess-3 | 2026-11-08T10:00:00Z | implementation | T2 | first line second line third',
      '',
    ]);
  });

  it('stamps the record with the current UTC time when none is given', () => {
    const line = formatSessionRecordLine({ sessionId: 's', role: 'implementation', title: 'x' });

    expect(line).toMatch(/^- s \| \d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ \| implementation \| - \| x\n$/);
  });
});

import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { checkErrors } from '../../../src/runtime/saga/check';
import { parseLock } from '../../../src/runtime/saga/contract';
import { freezeContract } from '../../../src/runtime/saga/freeze';
import { tickItem } from '../../../src/runtime/saga/mutate';
import { createPlannedSagaAt, writeProof } from './fixtures/saga-fixture';

// The same two item rows as createPlannedSagaAt, with a Mermaid dependency graph between them.
const ITEM_ROWS = '- [ ] T1 First item |\n- [ ] T2 Second item |\n';
const GRAPH = [
  '## Dependencies',
  '',
  '```mermaid',
  'flowchart TD',
  '    subgraph CLI["repos/cli"]',
  '        T1["T1 First item"]',
  '    end',
  '    subgraph CORE["repos/hagicode-core"]',
  '        T2["T2 Second item"]',
  '    end',
  '    T1 --> T2',
  '```',
  '',
].join('\n');

let root: string;
let sagaRoot: string;

beforeEach(() => {
  root = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'saga-mermaid-graph-')));
  sagaRoot = path.join(root, '.hagicode', 'sagas');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Plans two Sagas with identical item rows: `plain` has no graph, `graph` carries the Mermaid block. */
function plannedPair(): { plainDirectory: string; graphDirectory: string } {
  const plainDirectory = createPlannedSagaAt(sagaRoot, 'plain');
  const graphDirectory = createPlannedSagaAt(sagaRoot, 'graph');
  writeFileSync(path.join(plainDirectory, 'progress.md'), `# Plan\n\n${ITEM_ROWS}`);
  writeFileSync(path.join(graphDirectory, 'progress.md'), `# Plan\n\n${ITEM_ROWS}\n${GRAPH}`);
  return { plainDirectory, graphDirectory };
}

describe('Mermaid dependency graph in progress.md', () => {
  it('passes the plan check with the graph present', () => {
    plannedPair();
    expect(checkErrors(sagaRoot, 'graph', 'plan')).toEqual([]);
  });

  it('freezes to the same plan-items hash as the same rows without the graph', () => {
    plannedPair();
    freezeContract(sagaRoot, 'plain');
    freezeContract(sagaRoot, 'graph');

    const plain = parseLock(readFileSync(path.join(sagaRoot, 'plain', 'contract.lock'), 'utf8'));
    const graph = parseLock(readFileSync(path.join(sagaRoot, 'graph', 'contract.lock'), 'utf8'));
    expect(graph.hashes['plan-items']).toBe(plain.hashes['plan-items']);
    expect(graph.items).toEqual(plain.items);
  });

  it('keeps the graph lines unchanged when an item is ticked', () => {
    const { graphDirectory } = plannedPair();
    freezeContract(sagaRoot, 'graph');
    writeProof(graphDirectory, 'T1');

    expect(tickItem(sagaRoot, 'graph', 'T1')).toEqual({ itemId: 'T1', evidence: 'evidence/T1.log' });

    const progress = readFileSync(path.join(graphDirectory, 'progress.md'), 'utf8');
    expect(progress).toContain('- [x] T1 First item | evidence/T1.log');
    expect(progress).toContain(GRAPH);
  });
});

import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadSagaAssets } from '../../../src/runtime/saga/assets';
import { createSagaNatively, requireSagaResources } from '../../../src/runtime/saga/create';
import { installSagaResources } from '../../../src/runtime/saga/install';

const assets = loadSagaAssets();
const LEGACY_TOOL = ['saga', 'mjs'].join('.');

const legacyToolBytes = '// legacy standalone tool, left by an earlier installation\n';

function writeLegacyTool(projectRoot: string): string {
  const toolPath = path.join(projectRoot, '.hagicode', 'sagas', 'tools', LEGACY_TOOL);
  mkdirSync(path.dirname(toolPath), { recursive: true });
  writeFileSync(toolPath, legacyToolBytes);
  // Backdate the file so an unintended rewrite would change its modification time.
  const past = new Date('2020-01-01T00:00:00Z');
  utimesSync(toolPath, past, past);
  return toolPath;
}

describe(`Legacy tools/${LEGACY_TOOL} left by an earlier installation`, () => {
  let temporaryRoot: string;

  beforeEach(() => {
    temporaryRoot = mkdtempSync(path.join(os.tmpdir(), 'hagi-saga-legacy-tool-'));
  });

  afterEach(() => {
    rmSync(temporaryRoot, { recursive: true, force: true });
  });

  it.each([false, true])(`leaves a legacy tools/${LEGACY_TOOL} untouched during init (force=%s)`, force => {
    const projectRoot = path.join(temporaryRoot, 'legacy project');
    mkdirSync(projectRoot);
    const toolPath = writeLegacyTool(projectRoot);
    const before = statSync(toolPath);

    const report = installSagaResources(projectRoot, assets, force);

    expect(report.conflicts).toEqual([]);
    expect(report.files.map(file => file.path)).not.toContain(`tools/${LEGACY_TOOL}`);
    expect(readFileSync(toolPath, 'utf8')).toBe(legacyToolBytes);
    expect(statSync(toolPath).mtimeMs).toBe(before.mtimeMs);
  });

  it('creates a Saga in an installation that has no tools directory', () => {
    const projectRoot = path.join(temporaryRoot, 'fresh project');
    mkdirSync(projectRoot);

    const report = installSagaResources(projectRoot, assets);
    const sagaRoot = report.root;
    expect(statSync(path.join(sagaRoot, 'tools'), { throwIfNoEntry: false })).toBeUndefined();

    const promptsPath = requireSagaResources(sagaRoot, { kind: 'path', value: projectRoot });
    expect(promptsPath).toBe(path.join(sagaRoot, 'prompts'));

    const metadata = createSagaNatively('demo', sagaRoot);
    expect(metadata.id).toBe('demo');
    expect(statSync(path.join(sagaRoot, 'demo', 'saga.json')).isFile()).toBe(true);
  });

  it(`still accepts creation when a legacy tools/${LEGACY_TOOL} is present`, () => {
    const projectRoot = path.join(temporaryRoot, 'legacy creation project');
    mkdirSync(projectRoot);
    const toolPath = writeLegacyTool(projectRoot);
    const report = installSagaResources(projectRoot, assets);

    expect(() => requireSagaResources(report.root, { kind: 'path', value: projectRoot })).not.toThrow();
    createSagaNatively('demo', report.root);

    expect(readFileSync(toolPath, 'utf8')).toBe(legacyToolBytes);
  });
});

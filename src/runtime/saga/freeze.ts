import path from 'node:path';
import { CliSagaRefusalError } from '../errors';
import { acceptanceFingerprints, currentHashes, loadContractView, openAmendmentErrors, openQuestionErrors, planErrors, readFrozenLock } from './check';
import { serializeLock, sha256, splitLines, utcTimestamp } from './contract';
import { readSagaAmendments } from './read';
import {
  ensureDirectory,
  ensureRuntimeIgnore,
  moveFile,
  readContainedBytes,
  writeFileAtomic,
} from './safeWrite';

export type FreezeOutcome = {
  revision: number;
  previousRevision?: number;
  unchanged: boolean;
  reopened: string[];
  added: string[];
};

/**
 * Writes `contract.lock`: revision 1 for a valid first contract, unchanged on a repeat, or revision N+1 after an
 * amendment merged into `rN+1`. Every refusal is raised before the first write, so a refused freeze changes nothing.
 */
export function freezeContract(sagaRoot: string, sagaId: string): FreezeOutcome {
  const view = loadContractView(sagaRoot, sagaId);
  const refusals = [...planErrors(view), ...openQuestionErrors(view), ...openAmendmentErrors(view)];
  if (refusals.length > 0) {
    throw new CliSagaRefusalError(refusals);
  }

  const hashes = currentHashes(view);
  const acceptance = acceptanceFingerprints(view);
  const active = view.plan.active;
  const ids = [...active.map(row => row.id), ...view.plan.superseded.map(row => row.id)];
  const lockPath = path.join(view.directory, 'contract.lock');
  const frozen = readFrozenLock(view);

  if (!frozen) {
    writeFileAtomic(sagaRoot, lockPath, serializeLock({
      revision: 1,
      frozenAt: utcTimestamp(),
      prev: '-',
      hashes,
      acceptanceByItem: acceptance,
      items: ids,
    }));
    return { revision: 1, unchanged: false, reopened: [], added: active.map(row => row.id) };
  }

  const { text, lock: previous } = frozen;
  const unchanged = Object.keys(hashes).length === Object.keys(previous.hashes).length
    && Object.entries(hashes).every(([key, value]) => previous.hashes[key] === value);
  if (unchanged) {
    return { revision: previous.revision, unchanged: true, reopened: [], added: [] };
  }

  const target = `r${previous.revision + 1}`;
  if (!readSagaAmendments(view.directory).some(amendment => amendment.mergedIn === target)) {
    throw new CliSagaRefusalError([
      `contract changed without an amendment merged into ${target}: tamper or unrecorded change`,
    ]);
  }
  const known = new Set(ids);
  const removed = previous.items.filter(id => !known.has(id));
  if (removed.length > 0) {
    throw new CliSagaRefusalError([`item removed without being marked superseded: ${removed.join(', ')}`]);
  }

  ensureDirectory(sagaRoot, path.join(view.directory, 'revisions'));
  writeFileAtomic(sagaRoot, path.join(view.directory, 'revisions', `r${previous.revision}.lock`), text);

  const lines = splitLines(view.progress ?? '');
  const reopened: string[] = [];
  for (const row of active) {
    if (row.done && previous.acceptanceByItem[row.id] !== acceptance[row.id]) {
      lines[row.line] = `- [ ] ${row.id} ${row.title} | reopened in ${target}: acceptance changed`;
      reopened.push(row.id);
    }
  }
  if (reopened.length > 0) {
    ensureRuntimeIgnore(sagaRoot);
    const historyDirectory = path.join(view.directory, 'runtime', 'history', `r${previous.revision}`);
    ensureDirectory(sagaRoot, historyDirectory);
    for (const id of reopened) {
      for (const source of [
        path.join(view.directory, 'runtime', 'evidence', `${id}.log`),
        path.join(view.directory, 'runtime', 'reports', `${id}.md`),
      ]) {
        if (readContainedBytes(sagaRoot, source) !== undefined) {
          moveFile(sagaRoot, source, path.join(historyDirectory, path.basename(source)));
        }
      }
    }
  }

  writeFileAtomic(sagaRoot, path.join(view.directory, 'progress.md'), `${lines.join('\n')}\n`);
  writeFileAtomic(sagaRoot, lockPath, serializeLock({
    revision: previous.revision + 1,
    frozenAt: utcTimestamp(),
    prev: sha256(text),
    hashes,
    acceptanceByItem: acceptance,
    items: ids,
  }));
  return {
    revision: previous.revision + 1,
    previousRevision: previous.revision,
    unchanged: false,
    reopened,
    added: active.filter(row => !previous.items.includes(row.id)).map(row => row.id),
  };
}

import path from 'node:path';
import { readdirSync } from 'node:fs';
import { CliOperationFailedError, CliSagaRefusalError, CliUsageError } from '../errors';
import { checkErrors, loadContractView, openAmendmentErrors, PASS_REPORT_PATTERN } from './check';
import { splitLines, utcTimestamp } from './contract';
import {
  ensureDirectory,
  ensureRuntimeIgnore,
  moveDirectory,
  readContainedBytes,
  readContainedText,
  writeFileAtomic,
  writeFileExclusive,
  writeJsonAtomic,
} from './safeWrite';

type BlockedEntries = Record<string, string>;

/** Item IDs become file names under runtime/, so separators and dot segments are refused before any access. */
function isSafeItemId(id: string): boolean {
  return id.length > 0 && !/[\\/]/.test(id) && id !== '.' && id !== '..';
}

function readBlocked(sagaRoot: string, sagaId: string): BlockedEntries {
  const file = path.join(sagaRoot, sagaId, 'runtime', 'blocked.json');
  const text = readContainedText(sagaRoot, file);
  if (text === undefined) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new CliOperationFailedError(`Invalid Saga data in "${file}": ${(error as Error).message}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliOperationFailedError(`Invalid Saga data in "${file}": expected a JSON object.`);
  }
  return { ...(value as BlockedEntries) };
}

function progressPath(sagaRoot: string, sagaId: string): string {
  return path.join(sagaRoot, sagaId, 'progress.md');
}

/**
 * Marks an active item done as `- [x] <id> <title> | evidence/<id>.log`. Refused unless the item has a PASS report,
 * an evidence file and a passing run check; a refusal changes no file.
 */
export function tickItem(sagaRoot: string, sagaId: string, itemId: string | undefined): { itemId: string; evidence: string } {
  if (!itemId || !isSafeItemId(itemId)) {
    throw new CliSagaRefusalError([`invalid item ID: ${JSON.stringify(itemId ?? '')}`]);
  }
  const view = loadContractView(sagaRoot, sagaId);
  const row = view.plan.active.find(item => item.id === itemId);
  if (!row) {
    throw new CliSagaRefusalError([`unknown item ${itemId}: it is not an active item in progress.md`]);
  }
  const runtime = path.join(view.directory, 'runtime');
  const report = readContainedText(sagaRoot, path.join(runtime, 'reports', `${itemId}.md`));
  if (report === undefined || !PASS_REPORT_PATTERN.test(report)) {
    throw new CliSagaRefusalError([`no PASS report for ${itemId}: runtime/reports/${itemId}.md must contain "Status: PASS"`]);
  }
  if (readContainedBytes(sagaRoot, path.join(runtime, 'evidence', `${itemId}.log`)) === undefined) {
    throw new CliSagaRefusalError([`no evidence file for ${itemId}: runtime/evidence/${itemId}.log is missing`]);
  }
  const errors = checkErrors(sagaRoot, sagaId, 'run');
  if (errors.length > 0) {
    throw new CliSagaRefusalError(errors);
  }

  const evidence = `evidence/${itemId}.log`;
  const lines = splitLines(view.progress ?? '');
  lines[row.line] = `- [x] ${itemId} ${row.title} | ${evidence}`;
  ensureRuntimeIgnore(sagaRoot);
  writeFileAtomic(sagaRoot, progressPath(sagaRoot, sagaId), `${lines.join('\n')}\n`);

  const blocked = readBlocked(sagaRoot, sagaId);
  if (itemId in blocked) {
    delete blocked[itemId];
    writeJsonAtomic(sagaRoot, path.join(runtime, 'blocked.json'), blocked);
  }
  return { itemId, evidence };
}

/** Records a blocker for an active item in runtime/blocked.json; other entries are kept. */
export function blockItem(sagaRoot: string, sagaId: string, itemId: string | undefined, reason: string | undefined): { itemId: string; reason: string } {
  if (reason === undefined || reason.trim() === '') {
    throw new CliUsageError('block requires a nonempty reason.');
  }
  if (!itemId || !isSafeItemId(itemId)) {
    throw new CliSagaRefusalError([`invalid item ID: ${JSON.stringify(itemId ?? '')}`]);
  }
  const view = loadContractView(sagaRoot, sagaId);
  if (!view.plan.active.some(item => item.id === itemId)) {
    throw new CliSagaRefusalError([`unknown item ${itemId}: it is not an active item in progress.md`]);
  }
  ensureRuntimeIgnore(sagaRoot);
  const runtime = path.join(view.directory, 'runtime');
  ensureDirectory(sagaRoot, runtime);
  const blocked = readBlocked(sagaRoot, sagaId);
  blocked[itemId] = reason.trim();
  writeJsonAtomic(sagaRoot, path.join(runtime, 'blocked.json'), blocked);
  return { itemId, reason: reason.trim() };
}

function slugOf(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'amendment';
}

/** Appends an open amendment as the next numbered file; `merged-in:` stays empty until the contract absorbs it. */
export function amendSaga(sagaRoot: string, sagaId: string, title: string | undefined, text: string): { name: string; mergedIn: string } {
  const cleanTitle = (title ?? '').replace(/\s*[\r\n]+\s*/g, ' ').trim();
  if (cleanTitle === '') {
    throw new CliUsageError('amend requires a nonempty title.');
  }
  const directory = path.join(sagaRoot, sagaId, 'amendments');
  ensureDirectory(sagaRoot, directory);
  const numbers = readdirSync(directory)
    .map(name => /^(\d+)-.*\.md$/.exec(name))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(match => Number(match[1]));
  const next = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  const name = `${String(next).padStart(3, '0')}-${slugOf(cleanTitle)}.md`;
  writeFileExclusive(
    sagaRoot,
    path.join(directory, name),
    `title: ${cleanTitle}\ncreated-at: ${utcTimestamp()}\nmerged-in:\n---\n${text}\n`,
  );
  return { name, mergedIn: '' };
}

function localDate(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Moves a finished Saga into `archive/<date>-<id>`. Unfinished work needs `force`; an existing destination is refused
 * even with `force`.
 */
export function archiveSaga(sagaRoot: string, sagaId: string, force: boolean): { destination: string } {
  const view = loadContractView(sagaRoot, sagaId);
  const blocked = readBlocked(sagaRoot, sagaId);
  const problems: string[] = [];
  if (view.plan.active.length === 0) {
    problems.push('the saga has no active items');
  }
  for (const row of view.plan.active.filter(item => !item.done)) {
    problems.push(`item ${row.id} is ${row.id in blocked ? 'blocked' : 'pending'}`);
  }
  problems.push(...openAmendmentErrors(view));
  if (problems.length > 0 && !force) {
    throw new CliSagaRefusalError([...problems, 'use --force to archive anyway']);
  }

  const archiveRoot = path.join(sagaRoot, 'archive');
  ensureDirectory(sagaRoot, archiveRoot);
  const destination = path.join(archiveRoot, `${localDate()}-${sagaId}`);
  moveDirectory(sagaRoot, path.join(sagaRoot, sagaId), destination);
  return { destination };
}

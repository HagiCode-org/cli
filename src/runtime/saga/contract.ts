import { createHash } from 'node:crypto';
import { CliOperationFailedError } from '../errors';

/** Plan item row in progress.md: `- [ ] <id> <title> | <note>` (or `[x]`). */
export const ITEM_PATTERN = /^- \[( |x)\] (\S+) (.*?)\s*\|\s*(.*)$/;
/** Superseded plan row in progress.md: `- ~ <id> <title> | <note>`. */
export const SUPERSEDED_PATTERN = /^- ~ (\S+) (.*?)\s*\|\s*(.*)$/;

const OPEN_QUESTION_HEADINGS = new Set(['## 待决问题', '## Open questions']);
const DECIDED_MARKERS = ['[已决定', '[decided'];
const NONE_LINES = new Set(['- 无', '- none']);

export type ProgressActiveRow = {
  /** Zero-based line index in progress.md. */
  line: number;
  id: string;
  title: string;
  done: boolean;
  note: string;
};

export type ProgressSupersededRow = {
  id: string;
  title: string;
};

export type ProgressPlan = {
  active: ProgressActiveRow[];
  superseded: ProgressSupersededRow[];
};

export type ContractHashes = {
  goal: string;
  acceptance: string;
  'plan-items': string;
};

export type ContractLock = {
  revision: number;
  frozenAt?: string;
  prev?: string;
  hashes: Record<string, string>;
  acceptanceByItem: Record<string, string>;
  /** SHA-256 of each published method at freeze time; absent in locks written before method digests existed. */
  methods?: Record<string, string>;
  items: string[];
};

/** UTC timestamp in the form the bundled tool writes: no milliseconds, trailing Z. */
export function utcTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function sha256(bytes: string | Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** Lines of a text file without the final empty line; CRLF and LF are both accepted. */
export function splitLines(text: string): string[] {
  if (!text) {
    return [];
  }
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === '') {
    lines.pop();
  }
  return lines;
}

export function parseProgressPlan(text: string): ProgressPlan {
  const active: ProgressActiveRow[] = [];
  const superseded: ProgressSupersededRow[] = [];
  splitLines(text).forEach((line, index) => {
    const item = ITEM_PATTERN.exec(line);
    if (item) {
      active.push({ line: index, id: item[2], title: item[3], done: item[1] === 'x', note: item[4].trim() });
      return;
    }
    const old = SUPERSEDED_PATTERN.exec(line);
    if (old) {
      superseded.push({ id: old[1], title: old[2] });
    }
  });
  return { active, superseded };
}

export function parseAcceptanceCommands(text: string): Record<string, string> {
  const commands: Record<string, string> = {};
  let currentItem: string | undefined;
  for (const line of splitLines(text)) {
    const heading = /^## (\S+)/.exec(line);
    if (heading) {
      currentItem = heading[1];
    }
    const command = /^cmd:\s*(.+)$/.exec(line);
    if (command && currentItem) {
      commands[currentItem] = command[1].trim();
    }
  }
  return commands;
}

/** Research questions under an open-question heading that no human has decided yet. */
export function parseOpenQuestions(text: string): string[] {
  const questions: string[] = [];
  let inOpenSection = false;
  for (const line of splitLines(text)) {
    if (line.startsWith('## ')) {
      inOpenSection = OPEN_QUESTION_HEADINGS.has(line.trim());
      continue;
    }
    if (
      inOpenSection
      && line.startsWith('- ')
      && !DECIDED_MARKERS.some(marker => line.includes(marker))
      && !NONE_LINES.has(line.trim().toLowerCase())
    ) {
      questions.push(line.slice(2).trim());
    }
  }
  return questions;
}

/** Value of the `merged-in:` header of an amendment; empty when the amendment is still open. */
export function parseAmendmentMergedIn(text: string): string {
  const merged = /^merged-in:[ \t]*(\S*)[ \t]*$/m.exec(text);
  return merged ? merged[1] : '';
}

/** Plan-items fingerprint: active rows first, then superseded rows, one per line. */
export function planItemsText(plan: ProgressPlan): string {
  return [
    ...plan.active.map(row => `${row.id} ${row.title}`),
    ...plan.superseded.map(row => `~ ${row.id} ${row.title}`),
  ].join('\n');
}

export function acceptanceHashes(commands: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(commands).map(([id, command]) => [id, sha256(command)]));
}

/**
 * Byte layout identical to the bundled tool's contract.lock. The optional `methods:` section sits between
 * `acceptance-by-item:` and `items:`; a lock without it serializes exactly as before.
 */
export function serializeLock(lock: ContractLock): string {
  const section = (entries: Record<string, string>) => Object.entries(entries)
    .map(([key, value]) => `  ${key}: ${value}\n`)
    .join('');
  return `revision: ${lock.revision}\n`
    + (lock.frozenAt === undefined ? '' : `frozen-at: ${lock.frozenAt}\n`)
    + (lock.prev === undefined ? '' : `prev: ${lock.prev}\n`)
    + `hashes:\n${section(lock.hashes)}acceptance-by-item:\n${section(lock.acceptanceByItem)}`
    + (lock.methods === undefined ? '' : `methods:\n${section(lock.methods)}`)
    + `items: ${lock.items.join(' ')}\n`;
}

/** Parses contract.lock; a malformed file is an operation failure, never a silent default. */
export function parseLock(text: string, filePath = 'contract.lock'): ContractLock {
  const revision = /^revision:\s*(\d+)/m.exec(text);
  const hashesHeader = /^hashes:\r?\n/m.exec(text);
  const acceptanceHeader = /^acceptance-by-item:\r?\n/m.exec(text);
  const items = /^items:[ \t]*(.*)$/m.exec(text);
  if (!revision || !hashesHeader || !acceptanceHeader || !items) {
    throw new CliOperationFailedError(`Invalid Saga data in "${filePath}": malformed contract lock.`);
  }
  const revisionNumber = Number(revision[1]);
  if (!Number.isSafeInteger(revisionNumber)) {
    throw new CliOperationFailedError(`Invalid Saga data in "${filePath}": invalid revision.`);
  }
  const frozenAt = /^frozen-at:[ \t]*(\S*)/m.exec(text)?.[1];
  const prev = /^prev:[ \t]*(\S*)/m.exec(text)?.[1];
  return {
    revision: revisionNumber,
    frozenAt,
    prev,
    hashes: readSection(text, 'hashes'),
    acceptanceByItem: readSection(text, 'acceptance-by-item'),
    methods: /^methods:\r?\n/m.test(text) ? readSection(text, 'methods') : undefined,
    items: items[1].split(/\s+/).filter(Boolean),
  };
}

function readSection(text: string, name: string): Record<string, string> {
  const body = new RegExp(`^${name}:\\r?\\n((?:  .*\\r?\\n?)*)`, 'm').exec(text);
  if (!body) {
    return {};
  }
  return Object.fromEntries([...body[1].matchAll(/^ {2}(\S+):\s*(\S+)\s*$/gm)].map(match => [match[1], match[2]]));
}

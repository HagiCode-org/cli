import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { CliHttpError, CliOperationFailedError } from '../errors';
import {
  parseAcceptanceCommands,
  parseAmendmentMergedIn,
  parseLock,
  parseProgressPlan,
} from './contract';

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,62}$/;
const RESERVED_IDS = new Set(['prompts', 'tools', 'archive', 'runtime', 'amendments', 'revisions']);
const ARTIFACTS = [
  ['goal', 'goal.md'],
  ['research', 'research.md'],
  ['acceptance', 'acceptance.md'],
  ['plan', 'progress.md'],
] as const;

export type SagaPlanRows = {
  active: Array<{ id: string; title: string; done: boolean; note: string }>;
  superseded: Array<{ id: string; title: string }>;
};

export type SagaItem = {
  id: string;
  title: string;
  state: 'done' | 'blocked' | 'pending' | 'superseded';
  cmd: string;
  note: string;
};

export type SagaArtifacts = {
  goal: boolean;
  research: boolean;
  acceptance: boolean;
  plan: boolean;
};

export type SagaStatus = {
  schema: 'saga-status/2';
  sagaId: string;
  revision: number;
  state: 'draft' | 'planned' | 'running' | 'paused' | 'done';
  updatedAt: string;
  note: string;
  artifacts: SagaArtifacts;
  nextArtifact: keyof SagaArtifacts | null;
  counts: {
    total: number;
    done: number;
    blocked: number;
    pending: number;
    superseded: number;
  };
  openAmendments: number;
  items: Array<Pick<SagaItem, 'id' | 'title' | 'state'>>;
};

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function readRegularFile(filePath: string): string | undefined {
  let stat;
  try {
    stat = statSync(filePath);
  } catch (error) {
    if (isMissing(error)) {
      return undefined;
    }
    throw new CliOperationFailedError(`Cannot inspect Saga data "${filePath}": ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!stat.isFile()) {
    throw new CliOperationFailedError(`Cannot read Saga data "${filePath}": not a regular file.`);
  }
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new CliOperationFailedError(`Cannot read Saga data "${filePath}": ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function readSagaPlanRows(sagaDirectory: string): SagaPlanRows {
  const plan = parseProgressPlan(readRegularFile(path.join(sagaDirectory, 'progress.md')) ?? '');
  return {
    active: plan.active.map(({ id, title, done, note }) => ({ id, title, done, note })),
    superseded: plan.superseded,
  };
}

export function readSagaAcceptanceCommands(sagaDirectory: string): Record<string, string> {
  return parseAcceptanceCommands(readRegularFile(path.join(sagaDirectory, 'acceptance.md')) ?? '');
}

export function readSagaBlockedEntries(sagaDirectory: string): Record<string, unknown> {
  const filePath = path.join(sagaDirectory, 'runtime', 'blocked.json');
  const contents = readRegularFile(filePath);
  if (contents === undefined) {
    return {};
  }
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch (error) {
    throw new CliOperationFailedError(`Invalid Saga data in "${filePath}": ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliOperationFailedError(`Invalid Saga data in "${filePath}": expected a JSON object.`);
  }
  return value as Record<string, unknown>;
}

export function readSagaRevision(sagaDirectory: string): number {
  const filePath = path.join(sagaDirectory, 'contract.lock');
  const contents = readRegularFile(filePath);
  if (contents === undefined) {
    return 0;
  }
  return parseLock(contents, filePath).revision;
}

export function readSagaAmendments(sagaDirectory: string): Array<{ name: string; mergedIn: string }> {
  const directory = path.join(sagaDirectory, 'amendments');
  let names: string[];
  try {
    if (!statSync(directory).isDirectory()) {
      return [];
    }
    names = readdirSync(directory).filter(name => name.endsWith('.md')).sort();
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw new CliOperationFailedError(`Cannot read Saga amendments "${directory}": ${error instanceof Error ? error.message : String(error)}`);
  }

  return names.map(name => {
    const filePath = path.join(directory, name);
    const contents = readRegularFile(filePath);
    if (contents === undefined) {
      throw new CliOperationFailedError(`Cannot read Saga amendment "${filePath}": not a regular file.`);
    }
    return { name, mergedIn: parseAmendmentMergedIn(contents) };
  });
}

export function readSagaArtifacts(sagaDirectory: string): SagaArtifacts {
  const hasContent = (file: string): boolean => {
    const contents = readRegularFile(path.join(sagaDirectory, file));
    return contents !== undefined && contents.trim() !== '';
  };
  return {
    goal: hasContent('goal.md'),
    research: hasContent('research.md'),
    acceptance: hasContent('acceptance.md'),
    plan: hasContent('progress.md'),
  };
}

function projectSagaItems(sagaDirectory: string): SagaItem[] {
  const rows = readSagaPlanRows(sagaDirectory);
  const commands = readSagaAcceptanceCommands(sagaDirectory);
  const blocked = readSagaBlockedEntries(sagaDirectory);
  return [
    ...rows.active.map(row => ({
      id: row.id,
      title: row.title,
      state: row.done ? 'done' as const : row.id in blocked ? 'blocked' as const : 'pending' as const,
      cmd: commands[row.id] || '',
      note: row.note,
    })),
    ...rows.superseded.map(row => ({
      id: row.id,
      title: row.title,
      state: 'superseded' as const,
      cmd: '',
      note: '',
    })),
  ];
}

export function readSagaItems(sagaDirectory: string): SagaItem[] {
  return projectSagaItems(sagaDirectory);
}

export function readSagaStatus(sagaId: string, sagaDirectory: string): SagaStatus {
  const revision = readSagaRevision(sagaDirectory);
  const items = projectSagaItems(sagaDirectory);
  const artifacts = readSagaArtifacts(sagaDirectory);
  const activeItems = items.filter(item => item.state !== 'superseded');
  const done = items.filter(item => item.state === 'done').length;
  const nextArtifact = ARTIFACTS.find(([name]) => !artifacts[name])?.[0] ?? null;
  const state = revision === 0
    ? nextArtifact ? 'draft' : 'planned'
    : done === activeItems.length ? 'done' : 'running';
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  return {
    schema: 'saga-status/2',
    sagaId,
    revision,
    state,
    updatedAt: timestamp,
    note: '',
    artifacts,
    nextArtifact,
    counts: {
      total: activeItems.length,
      done,
      blocked: items.filter(item => item.state === 'blocked').length,
      pending: items.filter(item => item.state === 'pending').length,
      superseded: items.filter(item => item.state === 'superseded').length,
    },
    openAmendments: readSagaAmendments(sagaDirectory).filter(amendment => !amendment.mergedIn).length,
    items: items.map(({ id, title, state: itemState }) => ({ id, title, state: itemState })),
  };
}

export type SagaListRow = Pick<
  SagaStatus,
  'sagaId' | 'state' | 'revision' | 'counts' | 'openAmendments' | 'updatedAt'
>;

export function requireSagaDirectory(sagaRoot: string, sagaId: string): string {
  const missing = () => {
    throw new CliHttpError(404, `Saga "${sagaId}" was not found.`);
  };
  if (!ID_PATTERN.test(sagaId) || RESERVED_IDS.has(sagaId)) {
    missing();
  }
  const sagaDirectory = path.join(sagaRoot, sagaId);
  let stat;
  try {
    stat = lstatSync(sagaDirectory);
  } catch (error) {
    if (isMissing(error)) {
      missing();
    }
    throw new CliOperationFailedError(`Cannot inspect Saga "${sagaDirectory}": ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!stat.isDirectory()) {
    missing();
  }
  return sagaDirectory;
}

export function readActiveSagaIds(sagaRoot: string): string[] {
  let entries;
  try {
    entries = readdirSync(sagaRoot, { withFileTypes: true });
  } catch (error) {
    if (isMissing(error)) {
      return [];
    }
    throw new CliOperationFailedError(`Cannot list Sagas in "${sagaRoot}": ${error instanceof Error ? error.message : String(error)}`);
  }
  return entries
    .filter(entry => entry.isDirectory() && ID_PATTERN.test(entry.name) && !RESERVED_IDS.has(entry.name))
    .map(entry => entry.name)
    .sort();
}

export function readSagaList(sagaRoot: string): SagaListRow[] {
  return readActiveSagaIds(sagaRoot).map(sagaId => {
    const status = readSagaStatus(sagaId, path.join(sagaRoot, sagaId));
    return {
      sagaId: status.sagaId,
      state: status.state,
      revision: status.revision,
      counts: status.counts,
      openAmendments: status.openAmendments,
      updatedAt: status.updatedAt,
    };
  });
}

export function readSagaListPayload(sagaRoot: string): { sagas: SagaListRow[] } {
  return { sagas: readSagaList(sagaRoot) };
}

export function readSagaItemsPayload(sagaRoot: string, sagaId: string): { sagaId: string; items: SagaItem[] } {
  const sagaDirectory = requireSagaDirectory(sagaRoot, sagaId);
  return { sagaId, items: readSagaItems(sagaDirectory) };
}

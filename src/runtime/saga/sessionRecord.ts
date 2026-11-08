import { utcTimestamp } from './contract';

/** Worker roles `hagi saga session create --role` accepts; the same values are stored in `saga.worker`. */
export const WORKER_ROLES = ['implementation', 'verification'] as const;
export type WorkerRole = (typeof WORKER_ROLES)[number];

/** Value of `saga.role` on every Worker session created by the command. */
export const SAGA_WORKER_ROLE = 'worker';

export type WorkerMetadataInput = {
  sagaId: string;
  role: WorkerRole;
  masterSessionId: string;
  item?: string;
};

/**
 * The `saga.*` creation metadata of a Worker session. `saga.item` is added only when an item is given, so a Worker without
 * one carries exactly four entries. The token is never part of it.
 */
export function buildWorkerMetadata(input: WorkerMetadataInput): Record<string, string> {
  const metadata: Record<string, string> = {
    'saga.id': input.sagaId,
    'saga.role': SAGA_WORKER_ROLE,
    'saga.worker': input.role,
    'saga.master': input.masterSessionId,
  };
  if (input.item !== undefined) {
    metadata['saga.item'] = input.item;
  }
  return metadata;
}

export type SessionRecordInput = {
  sessionId: string;
  role: WorkerRole;
  item?: string;
  title: string;
  /** UTC timestamp; defaults to now. */
  createdAt?: string;
};

/**
 * The one-line record of a created Worker, with its line break: `- <session-id> | <UTC time> | <role> | <item or -> | <title>`.
 * Whitespace runs in the title, line breaks included, collapse to one space, so the record stays one line.
 */
export function formatSessionRecordLine(input: SessionRecordInput): string {
  const title = input.title.replace(/\s+/g, ' ').trim();
  const createdAt = input.createdAt ?? utcTimestamp();
  return `- ${input.sessionId} | ${createdAt} | ${input.role} | ${input.item ?? '-'} | ${title}\n`;
}

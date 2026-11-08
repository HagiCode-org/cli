import path from 'node:path';
import type { SagaInstallOutcome, SagaInstallReport } from '../runtime/saga/install';
import type { SagaMetadata } from '../runtime/saga/create';
import type { SagaItem, SagaListRow, SagaStatus } from '../runtime/saga/read';

export type SagaCreationResult = {
  id: string;
  directory: string;
  metadata: SagaMetadata;
};

export function formatSagaInitHuman(report: SagaInstallReport): string {
  const outcomes: SagaInstallOutcome[] = ['created', 'unchanged', 'merged', 'replaced', 'conflict'];
  const lines = [
    'Saga resource installation',
    `root       ${report.root}`,
    `force      ${report.force ? 'yes' : 'no'}`,
  ];

  for (const outcome of outcomes) {
    const files = report.files.filter(file => file.outcome === outcome).map(file => file.path);
    lines.push(`${outcome.padEnd(10)}${files.length > 0 ? files.join(', ') : 'none'}`);
  }

  return `${lines.join('\n')}\n`;
}

export function formatSagaNewHuman(result: SagaCreationResult, promptsPath: string): string {
  return [
    'Saga created',
    `id         ${result.id}`,
    `directory  ${result.directory}`,
    `createdAt  ${result.metadata.createdAt}`,
    `method     ${result.metadata.method}`,
    `next       read ${JSON.stringify(path.join(promptsPath, 'goal.md'))}, then write goal.md, research.md, acceptance.md and progress.md`,
    '',
  ].join('\n');
}

function formatCounts(counts: SagaStatus['counts']): string {
  return `total ${counts.total}, done ${counts.done}, blocked ${counts.blocked}, pending ${counts.pending}, superseded ${counts.superseded}`;
}

export function formatSagaListHuman(payload: { sagas: SagaListRow[] }): string {
  if (payload.sagas.length === 0) {
    return 'No active Sagas found.\n';
  }
  return [
    `Active Sagas (${payload.sagas.length})`,
    ...payload.sagas.map(saga =>
      `${saga.sagaId}  ${saga.state}  revision ${saga.revision}  ${formatCounts(saga.counts)}  open amendments ${saga.openAmendments}`,
    ),
    '',
  ].join('\n');
}

export function formatSagaStatusHuman(status: SagaStatus, promptsPath: string): string {
  const artifactSummary = Object.entries(status.artifacts)
    .map(([name, present]) => `${name}=${present ? 'written' : 'missing'}`)
    .join(', ');
  const next = status.nextArtifact
    ? `next artifact ${status.nextArtifact}: read ${JSON.stringify(path.join(promptsPath, `${status.nextArtifact}.md`))}`
    : 'next artifact none';
  return [
    `Saga ${status.sagaId}`,
    `state ${status.state}`,
    `revision ${status.revision}`,
    `observed ${status.updatedAt}`,
    `artifacts ${artifactSummary}`,
    next,
    `counts ${formatCounts(status.counts)}`,
    `open amendments ${status.openAmendments}`,
    '',
  ].join('\n');
}

export function formatSagaItemsHuman(payload: { sagaId: string; items: SagaItem[] }): string {
  if (payload.items.length === 0) {
    return `No plan items for Saga ${payload.sagaId}.\n`;
  }
  return [
    `Saga ${payload.sagaId} items (${payload.items.length})`,
    ...payload.items.map(item => {
      const details = [
        item.cmd ? `cmd: ${item.cmd}` : undefined,
        item.note ? `note: ${item.note}` : undefined,
      ].filter(Boolean);
      return `- [${item.state}] ${item.id} ${item.title}${details.length > 0 ? ` | ${details.join(' | ')}` : ''}`;
    }),
    '',
  ].join('\n');
}

export type SagaSessionCreateResult = {
  sagaId: string;
  session: { sessionId: string; userMetadata?: Record<string, string> };
  record: string;
};

/** Human output of `saga session create`: the created session ID, its `saga.*` metadata and the record file. */
export function formatSagaSessionCreateHuman(result: SagaSessionCreateResult): string {
  const metadata = Object.entries(result.session.userMetadata ?? {})
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
  return [
    `session created: ${result.session.sessionId}`,
    `saga          ${result.sagaId}`,
    `metadata      ${metadata || 'none'}`,
    `recorded in   ${result.record}`,
    '',
  ].join('\n');
}

/** Outcome line plus one line per refusal reason; the reasons are never folded into the outcome line. */
export function formatSagaRefusalHuman(command: string, sagaId: string, reasons: string[]): string {
  return [
    `refused: ${command} ${sagaId}`,
    ...reasons.map(reason => `  - ${reason}`),
    '',
  ].join('\n');
}

function formatList(value: unknown): string {
  const items = Array.isArray(value) ? value.map(String) : [];
  return items.length > 0 ? `[${items.map(item => `'${item}'`).join(', ')}]` : 'none';
}

/** Human output of a successful write or check; `result` is the same object the `--json` mode prints. */
export function formatSagaWriteHuman(command: string, result: Record<string, unknown>): string {
  const sagaId = String(result.sagaId);
  switch (command) {
    case 'claim':
      return [
        `claimed: ${sagaId}`,
        `owner session  ${String(result.ownerSession)}`,
        `token          ${String(result.token)}`,
        `created at     ${String(result.createdAt)}`,
        '',
      ].join('\n');
    case 'assert-owner':
      return result.locked
        ? `owner ok: ${sagaId} is owned by session ${String(result.ownerSession)}\n`
        : `no owner: ${sagaId} has no execution lock\n`;
    case 'release':
      return `released: ${sagaId} (owner session ${String(result.ownerSession)})\n`;
    case 'check':
      return `check passed: ${sagaId} (${String(result.phase)})\n`;
    case 'set-status':
      return `status set: ${sagaId} ${String(result.state)} (revision ${String(result.revision)})\n`;
    case 'tick':
      return `ticked: ${sagaId} ${String(result.itemId)} (${String(result.evidence)})\n`;
    case 'block':
      return `blocked: ${sagaId} ${String(result.itemId)}: ${String(result.reason)}\n`;
    case 'amend':
      return `amendment: ${sagaId} ${String(result.name)} (open)\n`;
    case 'archive':
      return `archived: ${sagaId} -> ${String(result.destination)}\n`;
    case 'freeze':
      if (result.unchanged) {
        return `freeze unchanged: ${sagaId} stays at revision ${String(result.revision)}\n`;
      }
      return [
        `frozen: ${sagaId} revision ${String(result.revision)}`
          + (result.previousRevision === null ? '' : ` (revised from ${String(result.previousRevision)})`),
        `reopened: ${formatList(result.reopened)}  added: ${formatList(result.added)}`,
        '',
      ].join('\n');
    default:
      return `${command}: ${sagaId}\n`;
  }
}

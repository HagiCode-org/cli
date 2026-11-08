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

export function formatSagaNewHuman(result: SagaCreationResult, toolPath: string): string {
  return [
    'Saga created',
    `id         ${result.id}`,
    `directory  ${result.directory}`,
    `createdAt  ${result.metadata.createdAt}`,
    `method     ${result.metadata.method}`,
    `next       node ${JSON.stringify(toolPath)} instructions ${result.id} goal`,
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

export function formatSagaStatusHuman(status: SagaStatus, toolPath: string): string {
  const artifactSummary = Object.entries(status.artifacts)
    .map(([name, present]) => `${name}=${present ? 'written' : 'missing'}`)
    .join(', ');
  const next = status.nextArtifact
    ? `next artifact ${status.nextArtifact}: node ${JSON.stringify(toolPath)} instructions ${status.sagaId} ${status.nextArtifact}`
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

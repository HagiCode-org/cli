import type { PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementMetadataEntryDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementMetadataEntryDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto';
import type { PCode_Application_Contracts_Dto_MonoSpecsRemoveCheckoutResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_MonoSpecsRemoveCheckoutResponseDto';
import type { PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto';
import { renderKeyValueTable, renderTable } from './table';

export type MonoSpecsMetadataEntryView = {
  key: string;
  value: string;
  valueKind: string;
};

export type MonoSpecsRepositoryView = {
  name?: string;
  code?: string;
  path: string;
  url?: string;
  displayName?: string;
  type?: string;
  icon?: string;
  optional: boolean;
  tags: string[];
  metadata: MonoSpecsMetadataEntryView[];
  isValidGitRepo: boolean;
  branch?: string;
  hasUncommittedChanges: boolean;
  unpushedCommitCount: number;
  hasTrackingBranch: boolean;
  trackingBranch?: string;
  aheadCount: number;
  behindCount: number;
  syncState?: string;
};

export type MonoSpecsDocumentPayload = {
  version: string;
  repoDirectory: string;
  configPath: string;
  commitWhenArchive: boolean;
  yamlPreview: string;
  metadata: MonoSpecsMetadataEntryView[];
  repositories: MonoSpecsRepositoryView[];
};

export type MonoSpecsClonePayload = {
  results: Array<{ path: string; status: string; message?: string }>;
};

export type MonoSpecsValidationPayload = {
  isValid: boolean;
  config: { version?: string; repoDirectory?: string } | null;
  warnings: string[];
  errors: string[];
};

function optionalString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toMetadataView(entry: PCode_Application_Contracts_Dto_MonoSpecsManagementMetadataEntryDto): MonoSpecsMetadataEntryView {
  return {
    key: entry.key ?? '',
    value: entry.value ?? '',
    valueKind: entry.valueKind ?? 'string',
  };
}

function toRepositoryView(repository: PCode_Application_Contracts_Dto_MonoSpecsManagementRepositoryDto): MonoSpecsRepositoryView {
  const isValidGitRepo = repository.isValidGitRepo === true;

  return {
    name: optionalString(repository.name),
    code: optionalString(repository.code),
    path: repository.path ?? '',
    url: optionalString(repository.url),
    displayName: optionalString(repository.displayName),
    type: optionalString(repository.type),
    icon: optionalString(repository.icon),
    optional: repository.optional === true,
    tags: repository.tags ?? [],
    metadata: (repository.metadata ?? []).map(toMetadataView),
    isValidGitRepo,
    // A repository that is not a valid Git checkout has no branch or sync state to report.
    branch: isValidGitRepo ? optionalString(repository.branch) : undefined,
    hasUncommittedChanges: repository.hasUncommittedChanges === true,
    unpushedCommitCount: repository.unpushedCommitCount ?? 0,
    hasTrackingBranch: repository.hasTrackingBranch === true,
    trackingBranch: optionalString(repository.trackingBranch),
    aheadCount: repository.aheadCount ?? 0,
    behindCount: repository.behindCount ?? 0,
    syncState: isValidGitRepo ? optionalString(repository.syncState) : undefined,
  };
}

/** Configured and local-state fields of the management document. `code` and `metadata` are kept. */
export function toMonoSpecsDocumentPayload(document: PCode_Application_Contracts_Dto_MonoSpecsManagementDto): MonoSpecsDocumentPayload {
  return {
    version: optionalString(document.version) ?? '',
    repoDirectory: optionalString(document.repoDirectory) ?? '',
    configPath: optionalString(document.configPath) ?? '',
    commitWhenArchive: document.commitWhenArchive === true,
    yamlPreview: document.yamlPreview ?? '',
    metadata: (document.metadata ?? []).map(toMetadataView),
    repositories: (document.repositories ?? []).map(toRepositoryView),
  };
}

function describeLocalState(repository: MonoSpecsRepositoryView): string {
  if (!repository.isValidGitRepo) {
    return 'missing or not a Git repository';
  }

  const parts = [repository.branch ?? 'no branch', repository.syncState, repository.hasUncommittedChanges ? 'uncommitted changes' : undefined];
  return parts.filter(Boolean).join(', ');
}

export function formatMonoSpecsDocumentHuman(payload: MonoSpecsDocumentPayload, options: { yaml?: boolean } = {}): string {
  const summary = renderKeyValueTable([
    ['version', payload.version],
    ['repoDirectory', payload.repoDirectory],
    ['configPath', payload.configPath],
    ['commitWhenArchive', String(payload.commitWhenArchive)],
  ]);

  const repositories =
    payload.repositories.length === 0
      ? 'This document lists no repositories.\n'
      : `${renderTable(
          [
            { header: 'Path', value: repository => repository.path },
            { header: 'Name', value: repository => repository.name ?? '' },
            { header: 'Type', value: repository => repository.type ?? '' },
            { header: 'URL', value: repository => repository.url ?? '' },
            { header: 'Local state', value: repository => describeLocalState(repository) },
          ],
          payload.repositories,
        )}\n`;

  const yaml = options.yaml ? `\nYAML\n${payload.yamlPreview}${payload.yamlPreview.endsWith('\n') ? '' : '\n'}` : '';
  return `${summary}\n${repositories}${yaml}`;
}

export function toMonoSpecsClonePayload(results: PCode_Application_Contracts_Dto_MonoSpecsCloneRepositoryResultDto[] | null | undefined): MonoSpecsClonePayload {
  return {
    results: (results ?? []).map(result => ({
      path: result.path ?? '',
      status: result.status ?? '',
      message: optionalString(result.message),
    })),
  };
}

export function formatMonoSpecsCloneHuman(payload: MonoSpecsClonePayload): string {
  if (payload.results.length === 0) {
    return 'No repositories were selected for cloning.\n';
  }

  return `${renderTable(
    [
      { header: 'Path', value: result => result.path },
      { header: 'Status', value: result => result.status },
      { header: 'Message', value: result => result.message ?? '' },
    ],
    payload.results,
  )}\n`;
}

export function toMonoSpecsValidationPayload(response: PCode_Application_Contracts_Dto_ValidateMonoSpecsResponseDto): MonoSpecsValidationPayload {
  return {
    isValid: response.isValid === true,
    config: response.config
      ? {
          version: optionalString(response.config.version),
          repoDirectory: optionalString(response.config.repoDirectory),
        }
      : null,
    warnings: response.warnings ?? [],
    errors: response.errors ?? [],
  };
}

export function formatMonoSpecsValidationHuman(payload: MonoSpecsValidationPayload): string {
  const heading = payload.isValid ? 'MonoSpecs configuration is valid.' : 'MonoSpecs configuration is invalid.';
  const details = renderKeyValueTable([
    ['version', payload.config?.version],
    ['repoDirectory', payload.config?.repoDirectory],
  ]);
  const warnings = payload.warnings.map(warning => `  - ${warning}\n`).join('');
  const errors = payload.errors.map(error => `  - ${error}\n`).join('');

  return [
    heading,
    details.trimEnd(),
    payload.warnings.length > 0 ? `Warnings:\n${warnings}`.trimEnd() : '',
    payload.errors.length > 0 ? `Errors:\n${errors}`.trimEnd() : '',
  ]
    .filter(Boolean)
    .join('\n') + '\n';
}

export function toMonoSpecsRemoveCheckoutPayload(response: PCode_Application_Contracts_Dto_MonoSpecsRemoveCheckoutResponseDto) {
  return {
    path: response.path ?? '',
    removed: response.removed === true,
    message: optionalString(response.message),
  };
}

export function formatMonoSpecsRemoveCheckoutHuman(payload: ReturnType<typeof toMonoSpecsRemoveCheckoutPayload>): string {
  const outcome = payload.removed ? `Removed checkout ${payload.path}` : `Checkout ${payload.path} was not removed`;
  return `${payload.message ? `${outcome}\n${payload.message}` : outcome}\n`;
}

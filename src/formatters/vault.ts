import type { PCode_Application_Contracts_Dto_DeleteVaultResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_DeleteVaultResponseDto';
import type { PCode_Application_Contracts_Dto_VaultBootstrapDiagnosticDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultBootstrapDiagnosticDto';
import type { PCode_Application_Contracts_Dto_VaultFileEntryDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFileEntryDto';
import type { PCode_Application_Contracts_Dto_VaultFileListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFileListResponseDto';
import type { PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto';
import type { PCode_Application_Contracts_Dto_VaultItemDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultItemDto';
import type { PCode_Application_Contracts_Dto_VaultListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_VaultListResponseDto';
import { renderKeyValueTable, renderTable } from './table';

export type VaultBootstrapDiagnosticView = {
  severity: string;
  code: string;
  message: string;
  relativePath?: string;
};

export type VaultView = {
  id: string;
  name: string;
  type: string;
  physicalPath: string;
  gitUrl?: string;
  createdAtUtc?: string;
  updatedAtUtc?: string;
  bootstrapDiagnostics: VaultBootstrapDiagnosticView[];
};

export type VaultListPayload = {
  generatedAtUtc?: string;
  vaults: VaultView[];
};

export type VaultFileEntryView = {
  relativePath: string;
  fileName: string;
  isDirectory: boolean;
  extension: string;
  sizeBytes: number;
  lastModifiedUtc?: string;
  previewSupported: boolean;
};

export type VaultFileListPayload = {
  vaultId: string;
  vaultName: string;
  physicalPath: string;
  status: string;
  errorCode?: string;
  message?: string;
  isTruncated: boolean;
  totalFileCount: number;
  items: VaultFileEntryView[];
};

export type VaultFilePreviewPayload = {
  vaultId: string;
  vaultName: string;
  physicalPath: string;
  relativePath: string;
  fileName: string;
  extension: string;
  sizeBytes: number;
  lastModifiedUtc?: string;
  status: string;
  errorCode?: string;
  message?: string;
  previewSupported: boolean;
  contentTruncated: boolean;
  content?: string;
};

export type VaultDeletePayload = {
  vaultId: string;
  deleted: boolean;
  deleteLocalFilesRequested: boolean;
  localFilesDeletionStatus?: string;
  localFilesDeleted: boolean;
};

function optionalString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toVaultBootstrapDiagnosticView(
  diagnostic: PCode_Application_Contracts_Dto_VaultBootstrapDiagnosticDto,
): VaultBootstrapDiagnosticView {
  return {
    severity: optionalString(diagnostic.severity) ?? '',
    code: optionalString(diagnostic.code) ?? '',
    message: optionalString(diagnostic.message) ?? '',
    relativePath: optionalString(diagnostic.relativePath),
  };
}

export function toVaultView(vault: PCode_Application_Contracts_Dto_VaultItemDto): VaultView {
  return {
    id: optionalString(vault.id) ?? '',
    name: optionalString(vault.name) ?? '',
    type: optionalString(vault.type) ?? '',
    physicalPath: optionalString(vault.physicalPath) ?? '',
    gitUrl: optionalString(vault.gitUrl),
    createdAtUtc: optionalString(vault.createdAtUtc),
    updatedAtUtc: optionalString(vault.updatedAtUtc),
    bootstrapDiagnostics: (vault.bootstrapDiagnostics ?? []).map(toVaultBootstrapDiagnosticView),
  };
}

export function formatVaultListPayload(response: PCode_Application_Contracts_Dto_VaultListResponseDto): VaultListPayload {
  return {
    generatedAtUtc: optionalString(response.generatedAtUtc),
    vaults: (response.items ?? []).map(toVaultView),
  };
}

export function formatVaultListHuman(vaults: VaultView[]): string {
  if (vaults.length === 0) {
    return 'No vaults found.\n';
  }

  return `Vaults (${vaults.length})\n${renderTable(
    [
      { header: 'Vault ID', value: vault => vault.id },
      { header: 'Type', value: vault => vault.type },
      { header: 'Name', value: vault => vault.name },
      { header: 'Path', value: vault => vault.physicalPath },
    ],
    vaults,
  )}\n`;
}

export function formatVaultSummaryHuman(
  vault: VaultView,
  extras: Array<[string, string | undefined]> = [],
): string {
  return renderKeyValueTable([
    ['id', vault.id],
    ['name', vault.name],
    ['type', vault.type],
    ['physicalPath', vault.physicalPath],
    ['gitUrl', vault.gitUrl],
    ['createdAtUtc', vault.createdAtUtc],
    ['updatedAtUtc', vault.updatedAtUtc],
    ['bootstrapDiagnostics', String(vault.bootstrapDiagnostics.length)],
    ...extras,
  ]);
}

function toVaultFileEntryView(file: PCode_Application_Contracts_Dto_VaultFileEntryDto): VaultFileEntryView {
  return {
    relativePath: optionalString(file.relativePath) ?? '',
    fileName: optionalString(file.fileName) ?? '',
    isDirectory: file.isDirectory === true,
    extension: optionalString(file.extension) ?? '',
    sizeBytes: typeof file.sizeBytes === 'number' ? file.sizeBytes : 0,
    lastModifiedUtc: optionalString(file.lastModifiedUtc),
    previewSupported: file.previewSupported === true,
  };
}

export function formatVaultDeletePayload(response: PCode_Application_Contracts_Dto_DeleteVaultResponseDto): VaultDeletePayload {
  return {
    vaultId: optionalString(response.id) ?? '',
    deleted: response.deleted === true,
    deleteLocalFilesRequested: response.deleteLocalFilesRequested === true,
    localFilesDeletionStatus: optionalString(response.localFilesDeletionStatus),
    localFilesDeleted: response.localFilesDeleted === true,
  };
}

export function formatVaultDeleteHuman(payload: VaultDeletePayload): string {
  return `Vault deleted\n${renderKeyValueTable([
    ['vaultId', payload.vaultId],
    ['deleted', String(payload.deleted)],
    ['deleteLocalFilesRequested', String(payload.deleteLocalFilesRequested)],
    ['localFilesDeletionStatus', payload.localFilesDeletionStatus],
    ['localFilesDeleted', String(payload.localFilesDeleted)],
  ])}`;
}

export function formatVaultFileListPayload(response: PCode_Application_Contracts_Dto_VaultFileListResponseDto): VaultFileListPayload {
  return {
    vaultId: optionalString(response.vaultId) ?? '',
    vaultName: optionalString(response.vaultName) ?? '',
    physicalPath: optionalString(response.physicalPath) ?? '',
    status: optionalString(response.status) ?? '',
    errorCode: optionalString(response.errorCode),
    message: optionalString(response.message),
    isTruncated: response.isTruncated === true,
    totalFileCount: typeof response.totalFileCount === 'number' ? response.totalFileCount : 0,
    items: (response.items ?? []).map(toVaultFileEntryView),
  };
}

export function formatVaultFileListHuman(payload: VaultFileListPayload): string {
  const summary = renderKeyValueTable([
    ['vaultId', payload.vaultId],
    ['vaultName', payload.vaultName],
    ['physicalPath', payload.physicalPath],
    ['status', payload.status],
    ['errorCode', payload.errorCode],
    ['message', payload.message],
    ['isTruncated', String(payload.isTruncated)],
    ['totalFileCount', String(payload.totalFileCount)],
  ]);

  if (payload.items.length === 0) {
    return `Vault files\n${summary}No files found.\n`;
  }

  return `Vault files\n${summary}${renderTable(
    [
      { header: 'Relative Path', value: item => item.relativePath },
      { header: 'Directory', value: item => (item.isDirectory ? 'yes' : 'no') },
      { header: 'Extension', value: item => item.extension },
      { header: 'Size', value: item => String(item.sizeBytes) },
      { header: 'Preview', value: item => (item.previewSupported ? 'yes' : 'no') },
    ],
    payload.items,
  )}\n`;
}

export function formatVaultFilePreviewPayload(
  response: PCode_Application_Contracts_Dto_VaultFilePreviewResponseDto,
): VaultFilePreviewPayload {
  return {
    vaultId: optionalString(response.vaultId) ?? '',
    vaultName: optionalString(response.vaultName) ?? '',
    physicalPath: optionalString(response.physicalPath) ?? '',
    relativePath: optionalString(response.relativePath) ?? '',
    fileName: optionalString(response.fileName) ?? '',
    extension: optionalString(response.extension) ?? '',
    sizeBytes: typeof response.sizeBytes === 'number' ? response.sizeBytes : 0,
    lastModifiedUtc: optionalString(response.lastModifiedUtc),
    status: optionalString(response.status) ?? '',
    errorCode: optionalString(response.errorCode),
    message: optionalString(response.message),
    previewSupported: response.previewSupported === true,
    contentTruncated: response.contentTruncated === true,
    content: optionalString(response.content),
  };
}

export function formatVaultFilePreviewHuman(payload: VaultFilePreviewPayload): string {
  const summary = renderKeyValueTable([
    ['vaultId', payload.vaultId],
    ['vaultName', payload.vaultName],
    ['physicalPath', payload.physicalPath],
    ['relativePath', payload.relativePath],
    ['fileName', payload.fileName],
    ['extension', payload.extension],
    ['sizeBytes', String(payload.sizeBytes)],
    ['lastModifiedUtc', payload.lastModifiedUtc],
    ['status', payload.status],
    ['errorCode', payload.errorCode],
    ['message', payload.message],
    ['previewSupported', String(payload.previewSupported)],
    ['contentTruncated', String(payload.contentTruncated)],
  ]);

  if (!payload.content) {
    return `Vault file preview\n${summary}`;
  }

  const suffix = payload.content.endsWith('\n') ? '' : '\n';
  return `Vault file preview\n${summary}content\n-------\n${payload.content}${suffix}`;
}

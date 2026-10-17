import type { PCode_Application_Contracts_Dto_InstallSkillResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_InstallSkillResultDto';
import type { PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto';
import type { PCode_Application_Contracts_Dto_SkillGalleryDetailDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SkillGalleryDetailDto';
import type { PCode_Application_Contracts_Dto_SkillGalleryResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SkillGalleryResponseDto';
import type { PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto';
import type { PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto';
import { renderKeyValueTable, renderTable } from './table';

function yesNo(value: boolean | null | undefined): string {
  return value ? 'yes' : 'no';
}

function listOrNone(values?: Array<string> | null): string {
  return values && values.length > 0 ? values.join(', ') : '-';
}

export function formatLocalSkillsHuman(response: PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto): string {
  const items = response.items ?? [];
  if (items.length === 0) {
    return 'No local skills installed.\n';
  }

  return `Local skills (${items.length})\n${renderTable(
    [
      { header: 'Name', value: item => item.name ?? '-' },
      { header: 'Scope', value: item => item.scope ?? '-' },
      { header: 'Agents', value: item => listOrNone(item.agents) },
      { header: 'Path', value: item => item.path ?? '-' },
    ],
    items,
  )}\n`;
}

export function formatUninstallResultHuman(result: PCode_Application_Contracts_Dto_UninstallLocalSkillResultDto): string {
  return renderKeyValueTable([
    ['skillName', result.skillName ?? undefined],
    ['status', result.status ?? undefined],
    ['message', result.userMessage ?? undefined],
    ['diagnostic', result.diagnosticMessage ?? undefined],
  ]);
}

export function formatGallerySearchHuman(response: PCode_Application_Contracts_Dto_SkillGalleryResponseDto): string {
  const items = response.items ?? [];
  if (items.length === 0) {
    return 'No gallery skills found.\n';
  }

  return `Gallery skills (${items.length})\n${renderTable(
    [
      { header: 'ID', value: item => item.id ?? '-' },
      { header: 'Source', value: item => item.source ?? '-' },
      { header: 'Installs', value: item => String(item.installs ?? 0) },
      { header: 'Trusted', value: item => yesNo(item.isTrustedSource) },
    ],
    items,
  )}\n`;
}

export function formatGalleryDetailHuman(detail: PCode_Application_Contracts_Dto_SkillGalleryDetailDto): string {
  const provider = detail.trustedProvider;
  return renderKeyValueTable([
    ['id', detail.id ?? undefined],
    ['source', detail.source ?? undefined],
    ['skillSlug', detail.skillSlug ?? undefined],
    ['installable', yesNo(detail.isInstallable)],
    ['description', detail.description ?? undefined],
    ['repository', detail.repositoryFullName ?? detail.repositoryName ?? undefined],
    ['repositoryUrl', detail.repositoryUrl ?? undefined],
    ['defaultBranch', detail.repositoryDefaultBranch ?? undefined],
    ['trustedSource', yesNo(detail.isTrustedSource)],
    ['trustedProvider', provider ? `${provider.displayName ?? provider.providerId ?? '-'}` : undefined],
    ['installReference', detail.installReference ?? undefined],
    ['installCommand', detail.installCommandPreview ?? undefined],
    ['installVersion', detail.installVersion ?? undefined],
    ['installHint', detail.installHint ?? undefined],
  ]);
}

export function formatGalleryInstallHuman(result: PCode_Application_Contracts_Dto_InstallSkillResultDto): string {
  return renderKeyValueTable([
    ['installReference', result.installReference ?? undefined],
    ['normalizedSkillKey', result.normalizedSkillKey ?? undefined],
    ['version', result.version ?? undefined],
    ['status', result.status ?? undefined],
    ['message', result.userMessage ?? undefined],
    ['diagnostic', result.diagnosticMessage ?? undefined],
    ['commandPreview', result.commandPreview ?? undefined],
  ]);
}

export function formatTrustedProvidersHuman(response: PCode_Application_Contracts_Dto_TrustedSkillProviderListResponseDto): string {
  const items = response.items ?? [];
  if (items.length === 0) {
    return `No trusted providers (directory version ${response.version ?? 0}).\n`;
  }

  return `Trusted providers (${items.length}, directory version ${response.version ?? 0})\n${renderTable(
    [
      { header: 'Provider ID', value: item => item.providerId ?? '-' },
      { header: 'Name', value: item => item.displayName ?? '-' },
      { header: 'Enabled', value: item => yesNo(item.isEnabled) },
      { header: 'Preset', value: item => yesNo(item.isPreset) },
      { header: 'Rules', value: item => String(item.ruleCount ?? 0) },
    ],
    items,
  )}\n`;
}

import type { PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto } from '../generated/api/models/PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto';
import type { PCode_Application_Contracts_Dto_LocalSkillItemDto } from '../generated/api/models/PCode_Application_Contracts_Dto_LocalSkillItemDto';
import type { PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto';
import { renderKeyValueTable, renderTable } from './table';

function yesNo(value: boolean | null | undefined): string {
  return value ? 'yes' : 'no';
}

function listOrNone(values?: Array<string> | null): string {
  return values && values.length > 0 ? values.join(', ') : '-';
}

/** Items from a backend that predates `origin` are user skills. */
function localSkillOrigin(item: PCode_Application_Contracts_Dto_LocalSkillItemDto): string {
  return item.origin ?? 'user';
}

function isBuiltInLocalSkill(item: PCode_Application_Contracts_Dto_LocalSkillItemDto): boolean {
  return localSkillOrigin(item) === 'built-in';
}

/** Availability only applies to built-in skills, so user rows show `-`. */
function localSkillEnabled(item: PCode_Application_Contracts_Dto_LocalSkillItemDto): string {
  return isBuiltInLocalSkill(item) ? yesNo(item.builtIn?.enabled) : '-';
}

function localSkillVersion(item: PCode_Application_Contracts_Dto_LocalSkillItemDto): string {
  const version = isBuiltInLocalSkill(item)
    ? item.builtIn?.version
    : item.managedInstallMetadata?.version;
  return version ?? '-';
}

export function formatLocalSkillsHuman(response: PCode_Application_Contracts_Dto_LocalSkillInventoryResponseDto): string {
  const items = response.items ?? [];
  if (items.length === 0) {
    return 'No local skills installed.\n';
  }

  return `Local skills (${items.length})\n${renderTable(
    [
      { header: 'Name', value: item => item.name ?? '-' },
      { header: 'Origin', value: localSkillOrigin },
      { header: 'Enabled', value: localSkillEnabled },
      { header: 'Version', value: localSkillVersion },
      { header: 'Scope', value: item => item.scope ?? '-' },
      { header: 'Agents', value: item => listOrNone(item.agents) },
      { header: 'Path', value: item => item.path ?? '-' },
    ],
    items,
  )}\n`;
}

export function formatBuiltInAvailabilityResultHuman(result: PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto): string {
  return renderKeyValueTable([
    ['skillName', result.slug ?? undefined],
    ['enabled', yesNo(result.enabled)],
    ['message', result.userMessage ?? undefined],
    ['diagnostic', result.diagnosticMessage ?? undefined],
  ]);
}

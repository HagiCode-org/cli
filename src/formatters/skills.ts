import type { PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto } from '../generated/api/models/PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto';
import type { LocalSkillInventoryDto, LocalSkillItemDto, SelfEvolutionSkillAvailabilityResultDto } from '../runtime/hagiApi';
import { renderKeyValueTable, renderTable, type TableColumn } from './table';

function yesNo(value: boolean | null | undefined): string {
  return value ? 'yes' : 'no';
}

function listOrNone(values?: Array<string> | null): string {
  return values && values.length > 0 ? values.join(', ') : '-';
}

/** Items from a backend that predates `origin` are user skills. */
export function localSkillOrigin(item: LocalSkillItemDto): string {
  return item.origin ?? 'user';
}

function isBuiltInLocalSkill(item: LocalSkillItemDto): boolean {
  return localSkillOrigin(item) === 'built-in';
}

function isSelfEvolutionLocalSkill(item: LocalSkillItemDto): boolean {
  return localSkillOrigin(item) === 'self-evolution';
}

/** Availability only applies to built-in and Self Evolution skills, so user rows show `-`. */
function localSkillEnabled(item: LocalSkillItemDto): string {
  if (isBuiltInLocalSkill(item)) {
    return yesNo(item.builtIn?.enabled);
  }
  return isSelfEvolutionLocalSkill(item) ? yesNo(item.selfEvolution?.enabled) : '-';
}

function localSkillVersion(item: LocalSkillItemDto): string {
  if (isBuiltInLocalSkill(item)) {
    return item.builtIn?.version ?? '-';
  }
  if (isSelfEvolutionLocalSkill(item)) {
    return item.selfEvolution?.version ?? '-';
  }
  return item.managedInstallMetadata?.version ?? '-';
}

/** Only Self Evolution rows carry a status. The value is the status word; no matched content is ever shown. */
function localSkillStatus(item: LocalSkillItemDto): string {
  return isSelfEvolutionLocalSkill(item) ? item.selfEvolution?.status ?? '-' : '-';
}

export function formatLocalSkillsHuman(response: LocalSkillInventoryDto): string {
  const items = response.items ?? [];
  if (items.length === 0) {
    return 'No local skills installed.\n';
  }

  // The Status column appears only when a Self Evolution row exists, so other listings stay as they were.
  const columns: TableColumn<LocalSkillItemDto>[] = [
    { header: 'Name', value: item => item.name ?? '-' },
    { header: 'Origin', value: localSkillOrigin },
    { header: 'Enabled', value: localSkillEnabled },
    { header: 'Version', value: localSkillVersion },
    ...(items.some(isSelfEvolutionLocalSkill) ? [{ header: 'Status', value: localSkillStatus }] : []),
    { header: 'Scope', value: item => item.scope ?? '-' },
    { header: 'Agents', value: item => listOrNone(item.agents) },
    { header: 'Path', value: item => item.path ?? '-' },
  ];

  return `Local skills (${items.length})\n${renderTable(columns, items)}\n`;
}

export function formatBuiltInAvailabilityResultHuman(
  result: PCode_Application_Contracts_Dto_SetBuiltInSkillAvailabilityResultDto,
  options: { selfEvolutionConflict?: boolean } = {},
): string {
  return renderKeyValueTable([
    ['skillName', result.slug ?? undefined],
    ['enabled', yesNo(result.enabled)],
    ['message', result.userMessage ?? undefined],
    ['diagnostic', result.diagnosticMessage ?? undefined],
    [
      'note',
      options.selfEvolutionConflict
        ? 'A Self Evolution Skill with this name is in conflict; the built-in skill was changed and the Self Evolution Skill was not.'
        : undefined,
    ],
  ]);
}

export function formatSelfEvolutionAvailabilityResultHuman(result: SelfEvolutionSkillAvailabilityResultDto): string {
  return renderKeyValueTable([
    ['skillName', result.slug ?? undefined],
    ['enabled', yesNo(result.enabled)],
    ['message', result.userMessage ?? undefined],
  ]);
}

import type { PCode_Web_Controllers_PresetTaskCreationSchemaDto } from '../generated/api/models/PCode_Web_Controllers_PresetTaskCreationSchemaDto';
import type { PCode_Web_Controllers_PresetTaskSchemaParameterDto } from '../generated/api/models/PCode_Web_Controllers_PresetTaskSchemaParameterDto';
import type { PCode_Web_Controllers_PresetTaskSchemaSummaryDto } from '../generated/api/models/PCode_Web_Controllers_PresetTaskSchemaSummaryDto';
import { renderKeyValueTable, renderTable } from './table';

const NONE = '-';

function yesNo(value: boolean | null | undefined): string {
  return value ? 'yes' : 'no';
}

function listOrNone(values?: Array<string> | null): string {
  return values && values.length > 0 ? values.join(', ') : NONE;
}

/**
 * Object keys sorted at every depth, so the same backend answer always prints the same bytes.
 * Array order is kept, because the backend ordering is meaningful for parameters and commands.
 */
export function sortKeysDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => sortKeysDeep(item)) as T;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map(key => [key, sortKeysDeep(record[key])]),
    ) as T;
  }

  return value;
}

/** Summaries ordered by id, so `hagitask list` does not depend on the order the backend returns. */
export function sortHagiTaskSummaries(
  items: PCode_Web_Controllers_PresetTaskSchemaSummaryDto[],
): PCode_Web_Controllers_PresetTaskSchemaSummaryDto[] {
  return [...items].sort((left, right) => {
    const leftId = left.id ?? '';
    const rightId = right.id ?? '';
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  });
}

export function formatHagiTaskListPayload(items: PCode_Web_Controllers_PresetTaskSchemaSummaryDto[]) {
  return sortKeysDeep({
    tasks: sortHagiTaskSummaries(items),
  });
}

export function formatHagiTaskListHuman(items: PCode_Web_Controllers_PresetTaskSchemaSummaryDto[]): string {
  if (items.length === 0) {
    return 'No HagiTask is available.\n';
  }

  const tasks = sortHagiTaskSummaries(items);
  return `HagiTasks (${tasks.length})\n${renderTable(
    [
      { header: 'ID', value: task => task.id ?? NONE },
      { header: 'Version', value: task => task.version ?? NONE },
      { header: 'Title', value: task => task.title ?? NONE },
      { header: 'Description', value: task => task.description ?? NONE },
    ],
    tasks,
  )}\n`;
}

function parameterNotes(parameter: PCode_Web_Controllers_PresetTaskSchemaParameterDto): string {
  const notes: string[] = [];
  if (parameter.origin === 'derived') {
    notes.push(parameter.producer ? `derived by ${parameter.producer}` : 'derived');
  }

  for (const alias of parameter.aliases ?? []) {
    if (alias.key) {
      notes.push(`alias ${alias.key} (deprecated)`);
    }
  }

  if (parameter.options && parameter.options.length > 0) {
    notes.push(`options: ${parameter.options.map(option => option.value ?? '').join(', ')}`);
  }

  return notes.length > 0 ? notes.join('; ') : NONE;
}

/**
 * Human view of one creation schema: scope, commands, parameters with required marks, requirements, scenes,
 * the endpoint and an example create command. The input JSON Schema stays in `--json` output.
 */
export function formatHagiTaskSchemaHuman(schema: PCode_Web_Controllers_PresetTaskCreationSchemaDto): string {
  const taskId = schema.id ?? NONE;
  const sections: string[] = [];

  sections.push(renderKeyValueTable([
    ['id', schema.id ?? undefined],
    ['title', schema.title ?? undefined],
    ['version', schema.version ?? undefined],
    ['locale', schema.locale ?? undefined],
    ['description', schema.description ?? undefined],
  ]));

  const targets = schema.scope?.targets ?? [];
  sections.push(`Target scope (default ${schema.scope?.defaultTargetType ?? NONE})${targets.length === 0 ? '\nNone.\n' : `\n${renderTable(
    [
      { header: 'ID', value: target => target.id ?? NONE },
      { header: 'Kind', value: target => target.kind ?? NONE },
      { header: 'Selection', value: target => target.selectionMode ?? NONE },
      { header: 'Required', value: target => yesNo(target.required) },
      { header: 'Access', value: target => listOrNone(target.allowedAccessTypes) },
      { header: 'Input key', value: target => target.requestKey ?? NONE },
      { header: 'Scope key', value: target => target.scopeRequestKey ?? NONE },
    ],
    targets,
  )}\n`}`);

  const commands = schema.commands?.commands ?? [];
  sections.push(`Commands${commands.length === 0 ? '\nNone.\n' : `\n${renderTable(
    [
      { header: 'ID', value: command => command.id ?? NONE },
      { header: 'Group', value: command => command.groupId ?? NONE },
      { header: 'Label', value: command => command.label ?? NONE },
      { header: 'URL', value: command => command.url ?? NONE },
    ],
    commands,
  )}\n`}`);

  const parameters = schema.parameters ?? [];
  sections.push(`Parameters${parameters.length === 0 ? '\nNone.\n' : `\n${renderTable(
    [
      { header: 'Key', value: parameter => parameter.key ?? NONE },
      { header: 'Required', value: parameter => yesNo(parameter.required) },
      { header: 'Origin', value: parameter => parameter.origin ?? NONE },
      { header: 'Type', value: parameter => parameter.valueType ?? NONE },
      { header: 'Label', value: parameter => parameter.label ?? NONE },
      { header: 'Notes', value: parameterNotes },
    ],
    parameters,
  )}\n`}`);

  const requirements = schema.requirements ?? [];
  sections.push(`Requirements${requirements.length === 0 ? '\nNone.\n' : `\n${requirements.map(requirement =>
    `- ${requirement.type ?? NONE}: ${requirement.name ?? listOrNone(requirement.names)}`,
  ).join('\n')}\n`}`);

  const registrations = schema.scenes?.registrations ?? [];
  sections.push(`Scenes${registrations.length === 0 ? '\nNone.\n' : `\n${registrations.map(scene =>
    `- ${scene.sceneKey ?? NONE}: ${scene.title ?? NONE}`,
  ).join('\n')}\n`}`);

  const request = schema.request;
  sections.push(renderKeyValueTable([
    ['endpoint', request ? `${request.method ?? NONE} ${request.path ?? NONE}` : undefined],
    ['presetTaskIdField', request?.presetTaskIdField ?? undefined],
    ['localeField', request?.localeField ?? undefined],
    ['requiredFields', request?.requiredFields && request.requiredFields.length > 0 ? request.requiredFields.join(', ') : undefined],
  ]));

  sections.push(`Example\n  hagi hagitask schema --task-id ${taskId} --json   # full input JSON Schema and example body\n  hagi hagitask create --title "<title>" --project-id <project-id> --task-id ${taskId} --input input.json\n`);

  return sections.join('\n');
}

export function formatHagiTaskSchemaPayload(schema: PCode_Web_Controllers_PresetTaskCreationSchemaDto) {
  return sortKeysDeep(schema);
}

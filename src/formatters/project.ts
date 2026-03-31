import type { PCode_Application_Contracts_Dto_ProjectAggregationDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProjectAggregationDto';
import type { PCode_Application_Contracts_Dto_ProjectDto } from '../generated/api/models/PCode_Application_Contracts_Dto_ProjectDto';
import { renderKeyValueTable, renderTable } from './table';

export type ProjectView = {
  id: string;
  name: string;
  path: string;
  description?: string;
  isMonoSpecs: boolean;
  monoSpecsVersion?: string;
  monoSpecsRepoDirectory?: string;
  monoSpecsCommitWhenArchive?: boolean;
  hasError: boolean;
  error?: string;
};

export type ProjectListPayload = {
  projects: ProjectView[];
};

function optionalString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function toProjectView(
  project: PCode_Application_Contracts_Dto_ProjectAggregationDto | PCode_Application_Contracts_Dto_ProjectDto,
): ProjectView {
  return {
    id: optionalString(project.id) ?? '',
    name: optionalString(project.name) ?? '',
    path: optionalString(project.path) ?? '',
    description: optionalString(project.description),
    isMonoSpecs: project.isMonoSpecs === true,
    monoSpecsVersion: optionalString(project.monoSpecsVersion),
    monoSpecsRepoDirectory: optionalString(project.monoSpecsRepoDirectory),
    monoSpecsCommitWhenArchive:
      typeof project.monoSpecsCommitWhenArchive === 'boolean' ? project.monoSpecsCommitWhenArchive : undefined,
    hasError: 'hasError' in project ? project.hasError === true : false,
    error: 'error' in project ? optionalString(project.error) : undefined,
  };
}

export function formatProjectListPayload(
  projects: Array<PCode_Application_Contracts_Dto_ProjectAggregationDto> | null | undefined,
): ProjectListPayload {
  return {
    projects: (projects ?? []).map(toProjectView),
  };
}

export function formatProjectListHuman(projects: ProjectView[]): string {
  if (projects.length === 0) {
    return 'No projects found.\n';
  }

  return `Projects (${projects.length})\n${renderTable(
    [
      { header: 'Project ID', value: project => project.id },
      { header: 'Name', value: project => project.name },
      { header: 'Path', value: project => project.path },
      { header: 'MonoSpecs', value: project => (project.isMonoSpecs ? 'yes' : 'no') },
      { header: 'Error', value: project => (project.hasError ? 'yes' : 'no') },
    ],
    projects,
  )}\n`;
}

export function formatProjectSummaryHuman(
  project: ProjectView,
  extras: Array<[string, string | undefined]> = [],
): string {
  return renderKeyValueTable([
    ['id', project.id],
    ['name', project.name],
    ['path', project.path],
    ['description', project.description],
    ['isMonoSpecs', String(project.isMonoSpecs)],
    ['monoSpecsVersion', project.monoSpecsVersion],
    ['monoSpecsRepoDirectory', project.monoSpecsRepoDirectory],
    [
      'monoSpecsCommitWhenArchive',
      typeof project.monoSpecsCommitWhenArchive === 'boolean'
        ? String(project.monoSpecsCommitWhenArchive)
        : undefined,
    ],
    ['hasError', String(project.hasError)],
    ['error', project.error],
    ...extras,
  ]);
}

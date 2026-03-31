import type { Command } from 'commander';
import type { PCode_Application_Contracts_Dto_AnnotationSubmissionDto } from '../../generated/api/models/PCode_Application_Contracts_Dto_AnnotationSubmissionDto';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { loadStructuredJson } from '../../runtime/inputLoader';

type ProposalAnnotateOptions = {
  sessionId: string;
  input: string;
  json?: boolean;
};

function buildAnnotationRequest(
  sessionId: string,
  raw: unknown,
): PCode_Application_Contracts_Dto_AnnotationSubmissionDto {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new CliUsageError('Annotation input must be a JSON object.');
  }

  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.files)) {
    throw new CliUsageError('Annotation input must include a files array.');
  }

  const totalAnnotations = typeof record.totalAnnotations === 'number'
    ? record.totalAnnotations
    : record.files.length;
  const submittedAt = typeof record.submittedAt === 'string' && record.submittedAt.trim()
    ? record.submittedAt
    : new Date().toISOString();

  return {
    ...(record as Omit<PCode_Application_Contracts_Dto_AnnotationSubmissionDto, 'sessionId' | 'totalAnnotations' | 'submittedAt'>),
    sessionId,
    totalAnnotations,
    submittedAt,
    files: record.files as PCode_Application_Contracts_Dto_AnnotationSubmissionDto['files'],
  };
}

export function registerProposalAnnotateCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('annotate')
      .description('Submit proposal annotations from structured JSON input.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id.')
    .requiredOption('--input <file>', 'JSON file path, or - to read from stdin.')
    .action(async function proposalAnnotateAction(this: Command, options: ProposalAnnotateOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const loaded = await loadStructuredJson<unknown>(options.input);
      const request = buildAnnotationRequest(sessionId, loaded);
      const response = await context.api.submitAnnotations(sessionId, request);

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          message: response.message,
          annotationCount: response.annotationCount ?? request.totalAnnotations,
          fileCount: response.fileCount ?? request.files.length,
        }));
        return;
      }

      context.io.stdout(
        `Proposal annotations submitted\nsessionId        ${sessionId}\nmessage          ${response.message}\nannotationCount  ${response.annotationCount ?? request.totalAnnotations}\nfileCount        ${response.fileCount ?? request.files.length}\n`,
      );
    });
}

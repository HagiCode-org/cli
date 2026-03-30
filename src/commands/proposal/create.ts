import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatProposalSessionSummaryHuman,
  toProposalSessionView,
} from '../../formatters/proposal';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';
import { PCode_Models_SessionType } from '../../generated/api/models/PCode_Models_SessionType';

const DEFAULT_PROPOSAL_TITLE = 'New Proposal';

type ProposalCreateOptions = {
  projectId: string;
  title?: string;
  chiefComplaint: string;
  originalChiefComplaint?: string;
  enableIndependentWorkspace?: boolean;
  baseBranch?: string;
  defaultTitle?: boolean;
  json?: boolean;
};

function resolveCreateTitle(options: ProposalCreateOptions): string {
  const explicitTitle = normalizeOptionalString(options.title);
  if (explicitTitle) {
    return explicitTitle;
  }

  if (options.defaultTitle) {
    return DEFAULT_PROPOSAL_TITLE;
  }

  throw new CliUsageError('Provide --title or pass --default-title to use the placeholder proposal title.');
}

export function registerProposalCreateCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('create')
      .description('Create a proposal session only. This command does not trigger later lifecycle APIs.'),
  );

  command
    .requiredOption('--project-id <id>', 'Project id that owns the new proposal session.')
    .requiredOption('--chief-complaint <text>', 'Proposal chief complaint to store on the new session.')
    .option('--original-chief-complaint <text>', 'Optional raw chief complaint text to keep alongside the stitched content.')
    .option('--title <title>', 'Explicit proposal session title.')
    .option('--default-title', `Mark the title as the placeholder title (${DEFAULT_PROPOSAL_TITLE}).`)
    .option('--enable-independent-workspace', 'Request an independent workspace for the proposal session.')
    .option('--base-branch <branch>', 'Optional base branch for the independent workspace.')
    .action(async function proposalCreateAction(this: Command, options: ProposalCreateOptions) {
      const context = createCommandContext(this, dependencies);
      const title = resolveCreateTitle(options);

      const session = await context.api.createSession({
        title,
        chiefComplaint: options.chiefComplaint.trim(),
        originalChiefComplaint: normalizeOptionalString(options.originalChiefComplaint),
        type: PCode_Models_SessionType.PROPOSAL,
        projectId: options.projectId.trim(),
        enableIndependentWorkspace: options.enableIndependentWorkspace ? true : undefined,
        baseBranch: normalizeOptionalString(options.baseBranch),
        isDefaultTitle: options.defaultTitle ? true : false,
      });

      const view = toProposalSessionView(session);
      const nextCommand = `hagi proposal generate-name --session-id ${view.sessionId}`;

      if (context.outputJson) {
        context.io.stdout(formatJson({
          session: view,
          nextCommand,
        }));
        return;
      }

      context.io.stdout(
        `Proposal session created\n${formatProposalSessionSummaryHuman(view, [
          ['next', nextCommand],
        ])}`,
      );
    });
}

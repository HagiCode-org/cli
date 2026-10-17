import type { Command } from 'commander';
import type { PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto } from '../../generated/api/models/PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

type ProposalOptimizeDescriptionOptions = {
  sessionId: string;
  description: string;
  title?: string;
  defaultTitle?: boolean;
  optimizationDirection?: string;
  originalChiefComplaint?: string;
  json?: boolean;
};

/**
 * Renders the optimization bundle. The backend applies the optimized title, description, and proposal name
 * to the session in the same step, so the output reports what was applied.
 */
export function formatOptimizeProposalHuman(
  sessionId: string,
  response: PCode_Application_Contracts_Dto_ProposalOptimizationBundleResponseDto,
): string {
  const applied = response.summary;
  const result = response.result;
  const valid = result?.validation?.isValid === true;
  const title = applied?.appliedTitle || result?.optimizedTitle || '';
  const proposalName = applied?.appliedProposalName || result?.optimizedProposalName || '';
  const diagnostics = result?.validation?.diagnostics ?? [];

  const lines = [
    valid ? 'Proposal optimized' : 'Proposal optimization returned diagnostics',
    `sessionId      ${sessionId}`,
    `title          ${title}`,
    `proposalName   ${proposalName}`,
    `valid          ${valid ? 'yes' : 'no'}`,
  ];

  for (const diagnostic of diagnostics) {
    lines.push(`diagnostic     ${diagnostic.code ?? 'UNKNOWN'}: ${diagnostic.message ?? ''}`.trimEnd());
  }

  if (valid) {
    lines.push(`next           hagi proposal generate --session-id ${sessionId}`);
  }

  return `${lines.join('\n')}\n`;
}

export function registerProposalOptimizeDescriptionCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('optimize-description')
      .description('Optimize the proposal description, title, and name in one backend step.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id to optimize.')
    .requiredOption('--description <text>', 'Description text to optimize.')
    .option('--title <title>', 'Current title snapshot. The session title is used when omitted.')
    .option('--default-title', 'Treat the current title as the placeholder title.')
    .option('--optimization-direction <text>', 'Optional optimization direction for AI guidance.')
    .option('--original-chief-complaint <text>', 'Optional original chief complaint to keep as context.')
    .action(async function proposalOptimizeDescriptionAction(this: Command, options: ProposalOptimizeDescriptionOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = requireOptionValue(options.sessionId, '--session-id');
      const response = await context.api.optimizeProposal(sessionId, {
        description: requireOptionValue(options.description, '--description'),
        title: normalizeOptionalString(options.title),
        isDefaultTitle: options.defaultTitle ? true : undefined,
        optimizationDirection: normalizeOptionalString(options.optimizationDirection),
        originalChiefComplaint: normalizeOptionalString(options.originalChiefComplaint),
      });

      if (context.outputJson) {
        context.io.stdout(formatJson({ sessionId, ...response }));
        return;
      }

      context.io.stdout(formatOptimizeProposalHuman(sessionId, response));
    });
}

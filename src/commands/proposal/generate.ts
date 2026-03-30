import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';

type ProposalGenerateOptions = {
  sessionId: string;
  enableExploreMode?: boolean;
  disableExploreMode?: boolean;
  heroId?: string;
  json?: boolean;
};

function resolveExploreMode(options: ProposalGenerateOptions): boolean | undefined {
  if (options.enableExploreMode && options.disableExploreMode) {
    throw new CliUsageError('Use either --enable-explore-mode or --disable-explore-mode, not both.');
  }

  if (options.enableExploreMode) {
    return true;
  }

  if (options.disableExploreMode) {
    return false;
  }

  return undefined;
}

export function registerProposalGenerateCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('generate')
      .description('Start proposal generation only. This command does not execute the proposal.'),
  );

  command
    .requiredOption('--session-id <id>', 'Proposal session id to generate.')
    .option('--enable-explore-mode', 'Explicitly enable explore mode for proposal generation.')
    .option('--disable-explore-mode', 'Explicitly disable explore mode for proposal generation.')
    .option('--hero-id <id>', 'Optional hero override for the generate stage.')
    .action(async function proposalGenerateAction(this: Command, options: ProposalGenerateOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const enableExploreMode = resolveExploreMode(options);

      const result = await context.api.generateProposal(sessionId, {
        enableExploreMode,
        heroId: normalizeOptionalString(options.heroId),
      });

      const nextCommand = `hagi proposal execute --session-id ${sessionId}`;

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          message: result.message,
          requested: {
            enableExploreMode,
            heroId: normalizeOptionalString(options.heroId),
          },
          nextCommand,
        }));
        return;
      }

      context.io.stdout(
        `Proposal generation started\nsessionId  ${sessionId}\nmessage    ${result.message}\nnext       Wait for the session to reach Reviewing, then run ${nextCommand}\n`,
      );
    });
}

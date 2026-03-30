import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';

type ProposalExecuteOptions = {
  sessionId: string;
  heroId?: string;
  json?: boolean;
};

export function registerProposalExecuteCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('execute')
      .description('Start proposal execution only. This command maps to the execute-proposal backend action.'),
  );

  command
    .requiredOption('--session-id <id>', 'Proposal session id to execute.')
    .option('--hero-id <id>', 'Optional hero override for the execute stage.')
    .action(async function proposalExecuteAction(this: Command, options: ProposalExecuteOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const heroId = normalizeOptionalString(options.heroId);
      const result = await context.api.executeProposal(sessionId, { heroId });

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          message: result.message,
          requested: {
            heroId,
          },
        }));
        return;
      }

      context.io.stdout(
        `Proposal execution started\nsessionId  ${sessionId}\nmessage    ${result.message}\n`,
      );
    });
}

import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

type ProposalGenerateNameOptions = {
  sessionId: string;
  json?: boolean;
};

export function registerProposalGenerateNameCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('generate-name')
      .description('Generate a proposal name only. This command maps to the generate-proposal-name backend action.'),
  );

  command
    .requiredOption('--session-id <id>', 'Proposal session id to update.')
    .action(async function proposalGenerateNameAction(this: Command, options: ProposalGenerateNameOptions) {
      const context = createCommandContext(this, dependencies);
      const proposalName = await context.api.generateProposalName(options.sessionId.trim());
      const nextCommand = `hagi proposal generate --session-id ${options.sessionId.trim()}`;

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId: options.sessionId.trim(),
          proposalName: proposalName.proposalName,
          nextCommand,
        }));
        return;
      }

      context.io.stdout(
        `Proposal name generated\nsessionId     ${options.sessionId.trim()}\nproposalName  ${proposalName.proposalName}\nnext          ${nextCommand}\n`,
      );
    });
}

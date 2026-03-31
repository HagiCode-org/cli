import type { Command } from 'commander';
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
  optimizationDirection?: string;
  disableMemoryOptimization?: boolean;
  defaultTitle?: boolean;
  json?: boolean;
};

export function registerProposalOptimizeDescriptionCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('optimize-description')
      .description('Start asynchronous proposal description optimization only.'),
  )
    .requiredOption('--session-id <id>', 'Proposal session id to optimize.')
    .requiredOption('--description <text>', 'Description text to optimize.')
    .option('--optimization-direction <text>', 'Optional optimization direction for AI guidance.')
    .option('--disable-memory-optimization', 'Disable long-term memory during optimization.')
    .option('--default-title', 'Treat the current title as a placeholder title.')
    .action(async function proposalOptimizeDescriptionAction(this: Command, options: ProposalOptimizeDescriptionOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const response = await context.api.optimizeDescription(sessionId, {
        description: requireOptionValue(options.description, '--description'),
        optimizationDirection: normalizeOptionalString(options.optimizationDirection),
        enableMemoryOptimization: options.disableMemoryOptimization ? false : undefined,
        isDefaultTitle: options.defaultTitle ? true : undefined,
      });

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          taskId: response.taskId,
          status: response.status,
        }));
        return;
      }

      context.io.stdout(
        `Proposal description optimization started\nsessionId  ${sessionId}\ntaskId     ${response.taskId ?? ''}\nstatus     ${response.status ?? ''}\n`,
      );
    });
}

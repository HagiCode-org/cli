import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliUsageError } from '../../runtime/errors';

/** Content languages the backend accepts for generated proposals. "Follow the interface" is resolved by the caller. */
export const PROPOSAL_CONTENT_LANGUAGES = [
  'zh-CN',
  'zh-Hant',
  'en-US',
  'ja-JP',
  'ko-KR',
  'de-DE',
  'fr-FR',
  'es-ES',
  'pt-BR',
  'ru-RU',
] as const;

type ProposalGenerateOptions = {
  sessionId: string;
  proposalContentLanguage: string;
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

function resolveContentLanguage(value: string): string {
  const normalized = value.trim();
  if (!(PROPOSAL_CONTENT_LANGUAGES as readonly string[]).includes(normalized)) {
    throw new CliUsageError(
      `--proposal-content-language must be one of: ${PROPOSAL_CONTENT_LANGUAGES.join(', ')}.`,
    );
  }

  return normalized;
}

export function registerProposalGenerateCommand(parent: Command, dependencies: AppDependencies): void {
  const command = addJsonOption(
    parent
      .command('generate')
      .description('Start proposal generation only. This command does not execute the proposal.'),
  );

  command
    .requiredOption('--session-id <id>', 'Proposal session id to generate.')
    .requiredOption(
      '--proposal-content-language <language>',
      `Language of the generated proposal content (${PROPOSAL_CONTENT_LANGUAGES.join(', ')}).`,
    )
    .option('--enable-explore-mode', 'Explicitly enable explore mode for proposal generation.')
    .option('--disable-explore-mode', 'Explicitly disable explore mode for proposal generation.')
    .option('--hero-id <id>', 'Optional hero override for the generate stage.')
    .action(async function proposalGenerateAction(this: Command, options: ProposalGenerateOptions) {
      const context = createCommandContext(this, dependencies);
      const sessionId = options.sessionId.trim();
      const enableExploreMode = resolveExploreMode(options);
      const proposalContentLanguage = resolveContentLanguage(options.proposalContentLanguage);

      const result = await context.api.generateProposal(sessionId, {
        enableExploreMode,
        heroId: normalizeOptionalString(options.heroId),
        proposalContentLanguage,
      });

      const nextCommand = `hagi proposal execute --session-id ${sessionId}`;

      if (context.outputJson) {
        context.io.stdout(formatJson({
          sessionId,
          message: result.message,
          requested: {
            enableExploreMode,
            heroId: normalizeOptionalString(options.heroId),
            proposalContentLanguage,
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

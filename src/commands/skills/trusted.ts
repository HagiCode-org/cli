import type { Command } from 'commander';
import type { PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto } from '../../generated/api/models/PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto';
import type { PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto } from '../../generated/api/models/PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto';
import { formatJson } from '../../formatters/json';
import { formatTrustedProvidersHuman } from '../../formatters/skills';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { readJsonObjectInput } from './shared';

type SkillsTrustedUpsertOptions = {
  input: string;
  json?: boolean;
};

type SkillsTrustedDeleteOptions = {
  providerId: string;
  json?: boolean;
};

export function registerSkillsTrustedCommands(skills: Command, dependencies: AppDependencies): void {
  const trusted = skills
    .command('trusted')
    .description('Manage the trusted skill provider directory.');

  addJsonOption(
    trusted
      .command('list')
      .description('List trusted skill providers.'),
  ).action(async function skillsTrustedListAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const response = await context.api.listTrustedSkillProviders();

    if (context.outputJson) {
      context.io.stdout(formatJson(response));
      return;
    }

    context.io.stdout(formatTrustedProvidersHuman(response));
  });

  addJsonOption(
    trusted
      .command('upsert')
      .description('Create or update a trusted provider from a JSON document.'),
  )
    .requiredOption('--input <file>', 'JSON file path, or - to read from stdin.')
    .action(async function skillsTrustedUpsertAction(this: Command, options: SkillsTrustedUpsertOptions) {
      const context = createCommandContext(this, dependencies);
      const body = await readJsonObjectInput<PCode_Application_Contracts_Dto_UpsertTrustedSkillProviderRequestDto>(
        requireOptionValue(options.input, '--input'),
        'Trusted provider input',
      );
      const response = await context.api.upsertTrustedSkillProvider(body);

      if (context.outputJson) {
        context.io.stdout(formatJson(response));
        return;
      }

      context.io.stdout(formatTrustedProvidersHuman(response));
    });

  addJsonOption(
    trusted
      .command('delete')
      .description('Delete one trusted provider by id.'),
  )
    .requiredOption('--provider-id <id>', 'Trusted provider id to delete.')
    .action(async function skillsTrustedDeleteAction(this: Command, options: SkillsTrustedDeleteOptions) {
      const context = createCommandContext(this, dependencies);
      const body: PCode_Application_Contracts_Dto_DeleteTrustedSkillProviderRequestDto = {
        providerId: requireOptionValue(options.providerId, '--provider-id'),
      };
      const response = await context.api.deleteTrustedSkillProvider(body);

      if (context.outputJson) {
        context.io.stdout(formatJson(response));
        return;
      }

      context.io.stdout(formatTrustedProvidersHuman(response));
    });

  addJsonOption(
    trusted
      .command('reset')
      .description('Reset trusted providers to the backend defaults.'),
  ).action(async function skillsTrustedResetAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const response = await context.api.resetTrustedSkillProviders();

    if (context.outputJson) {
      context.io.stdout(formatJson(response));
      return;
    }

    context.io.stdout(formatTrustedProvidersHuman(response));
  });
}

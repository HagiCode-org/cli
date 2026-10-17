import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatGalleryDetailHuman,
  formatGalleryInstallHuman,
  formatGallerySearchHuman,
} from '../../formatters/skills';
import {
  addJsonOption,
  createCommandContext,
  normalizeOptionalString,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';

type SkillsGallerySearchOptions = {
  query?: string;
  json?: boolean;
};

type SkillsGalleryDetailOptions = {
  id: string;
  source: string;
  json?: boolean;
};

type SkillsGalleryInstallOptions = {
  id: string;
  source: string;
  skillSlug: string;
  version?: string;
  json?: boolean;
};

export function registerSkillsGalleryCommands(skills: Command, dependencies: AppDependencies): void {
  const gallery = skills
    .command('gallery')
    .description('Search the skill gallery, read skill details, and start managed installs.');

  addJsonOption(
    gallery
      .command('search')
      .description('Search the skill gallery by keyword.'),
  )
    .option('--query <query>', 'Keyword to search for. Omit to list the gallery.')
    .action(async function skillsGallerySearchAction(this: Command, options: SkillsGallerySearchOptions) {
      const context = createCommandContext(this, dependencies);
      const response = await context.api.searchSkillGallery(normalizeOptionalString(options.query));

      if (context.outputJson) {
        context.io.stdout(formatJson(response));
        return;
      }

      context.io.stdout(formatGallerySearchHuman(response));
    });

  addJsonOption(
    gallery
      .command('detail')
      .description('Show one gallery skill with installability, trust, and repository details.'),
  )
    .requiredOption('--id <id>', 'Gallery skill id.')
    .requiredOption('--source <source>', 'Gallery skill source.')
    .action(async function skillsGalleryDetailAction(this: Command, options: SkillsGalleryDetailOptions) {
      const context = createCommandContext(this, dependencies);
      const detail = await context.api.getSkillGalleryDetail(
        requireOptionValue(options.id, '--id'),
        requireOptionValue(options.source, '--source'),
      );

      if (context.outputJson) {
        context.io.stdout(formatJson(detail));
        return;
      }

      context.io.stdout(formatGalleryDetailHuman(detail));
    });

  addJsonOption(
    gallery
      .command('install')
      .description('Start a managed install of one gallery skill.'),
  )
    .requiredOption('--id <id>', 'Gallery skill id.')
    .requiredOption('--source <source>', 'Gallery skill source.')
    .requiredOption('--skill-slug <slug>', 'Skill slug inside the source repository.')
    .option('--version <version>', 'Optional version token to install.')
    .action(async function skillsGalleryInstallAction(this: Command, options: SkillsGalleryInstallOptions) {
      const context = createCommandContext(this, dependencies);
      const result = await context.api.installGallerySkill({
        id: requireOptionValue(options.id, '--id'),
        source: requireOptionValue(options.source, '--source'),
        skillSlug: requireOptionValue(options.skillSlug, '--skill-slug'),
        version: normalizeOptionalString(options.version),
      });

      if (context.outputJson) {
        context.io.stdout(formatJson(result));
        return;
      }

      context.io.stdout(formatGalleryInstallHuman(result));
    });
}

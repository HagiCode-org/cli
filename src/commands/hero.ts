import type { Command } from 'commander';
import { formatJson } from '../formatters/json';
import { formatHeroListHuman, toHeroListItems } from '../formatters/hero';
import { addJsonOption, createCommandContext, type AppDependencies } from '../runtime/commandContext';

export function registerHeroCommands(program: Command, dependencies: AppDependencies): void {
  const hero = program
    .command('hero')
    .description('Read the Heroes the backend supports. Read-only.');

  addJsonOption(
    hero
      .command('list')
      .description('List the Heroes a chat can run with: the ones `--hero <name-or-id>` accepts. Read-only.')
      .addHelpText(
        'after',
        `
A Hero is listed when it is enabled and is neither built in nor read only. Pass its heroId to \`--hero\`, or its name.
`,
      ),
  ).action(async function heroListAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const items = toHeroListItems(await context.api.listHeroes());

    context.io.stdout(context.outputJson ? formatJson({ heroes: items }) : formatHeroListHuman(items));
  });
}

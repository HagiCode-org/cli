import type { Command } from 'commander';
import { formatJson } from '../../formatters/json';
import {
  formatProjectListHuman,
  formatProjectListPayload,
} from '../../formatters/project';
import {
  addJsonOption,
  createCommandContext,
  type AppDependencies,
} from '../../runtime/commandContext';

export function registerProjectListCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('list')
      .description('List projects from the aggregation endpoint.'),
  ).action(async function projectListAction(this: Command) {
    const context = createCommandContext(this, dependencies);
    const response = await context.api.listProjects();
    const payload = formatProjectListPayload(response.projects);

    if (context.outputJson) {
      context.io.stdout(formatJson(payload));
      return;
    }

    context.io.stdout(formatProjectListHuman(payload.projects));
  });
}

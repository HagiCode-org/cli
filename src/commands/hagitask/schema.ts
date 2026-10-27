import type { Command } from 'commander';
import type { PCode_Web_Controllers_PresetTaskCreationSchemaDto } from '../../generated/api/models/PCode_Web_Controllers_PresetTaskCreationSchemaDto';
import type { HagiApi } from '../../runtime/hagiApi';
import { formatJson } from '../../formatters/json';
import { formatHagiTaskSchemaHuman, formatHagiTaskSchemaPayload } from '../../formatters/hagitask';
import {
  addJsonOption,
  createCommandContext,
  requireOptionValue,
  type AppDependencies,
} from '../../runtime/commandContext';
import { CliHttpError, readBackendFailure } from '../../runtime/errors';

type HagiTaskSchemaOptions = {
  taskId: string;
  json?: boolean;
};

type UnavailableDiagnostic = {
  code?: string | null;
  message?: string | null;
  path?: string | null;
};

function readString(source: unknown, key: string): string | undefined {
  const value = source && typeof source === 'object' ? (source as Record<string, unknown>)[key] : undefined;
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readDiagnostics(body: unknown): UnavailableDiagnostic[] {
  const diagnostics = body && typeof body === 'object' ? (body as Record<string, unknown>).diagnostics : undefined;
  return Array.isArray(diagnostics) ? diagnostics as UnavailableDiagnostic[] : [];
}

/**
 * Reads one schema. A not-found answer for a disabled task carries diagnostics that the generic error
 * mapping would drop, so they are added to the message here.
 */
async function loadHagiTaskSchema(api: HagiApi, taskId: string): Promise<PCode_Web_Controllers_PresetTaskCreationSchemaDto> {
  try {
    return await api.getHagiTaskSchema(taskId);
  } catch (error) {
    const failure = readBackendFailure(error);
    if (failure?.status === 404) {
      const diagnostics = readDiagnostics(failure.body);
      if (diagnostics.length > 0) {
        const lines = diagnostics.map(diagnostic => {
          const location = diagnostic.path ? ` (${diagnostic.path})` : '';
          return `  - ${diagnostic.code ?? 'diagnostic'}: ${diagnostic.message ?? ''}${location}`;
        });
        const message = readString(failure.body, 'error') ?? `HagiTask ${taskId} is not available.`;
        throw new CliHttpError(404, [message, ...lines].join('\n'), failure.body);
      }
    }

    throw error;
  }
}

export function registerHagiTaskSchemaCommand(parent: Command, dependencies: AppDependencies): void {
  addJsonOption(
    parent
      .command('schema')
      .description('Show the creation schema of one HagiTask: scope, commands, parameters, requirements, scenes and an example. --json prints the full schema, including the input JSON Schema.'),
  )
    .requiredOption('--task-id <id>', 'HagiTask id to read.')
    .action(async function hagiTaskSchemaAction(this: Command, options: HagiTaskSchemaOptions) {
      const taskId = requireOptionValue(options.taskId, '--task-id');
      const context = createCommandContext(this, dependencies);
      const schema = await loadHagiTaskSchema(context.api, taskId);

      if (context.outputJson) {
        context.io.stdout(formatJson(formatHagiTaskSchemaPayload(schema)));
        return;
      }

      context.io.stdout(formatHagiTaskSchemaHuman(schema));
    });
}

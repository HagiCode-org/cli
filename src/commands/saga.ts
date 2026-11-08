import type { Command } from 'commander';
import path from 'node:path';
import { addJsonOption, type AppDependencies } from '../runtime/commandContext';
import { formatJson } from '../formatters/json';
import {
  formatSagaInitHuman,
  formatSagaItemsHuman,
  formatSagaListHuman,
  formatSagaNewHuman,
  formatSagaStatusHuman,
} from '../formatters/saga';
import { SagaResourceConflictError } from '../runtime/errors';
import { loadSagaAssets } from '../runtime/saga/assets';
import {
  createSagaWithCanonicalTool,
  requireSagaResources,
  validateSagaId,
} from '../runtime/saga/create';
import { installSagaResources } from '../runtime/saga/install';
import {
  readSagaItemsPayload,
  readSagaListPayload,
  readSagaStatus,
  requireSagaDirectory,
} from '../runtime/saga/read';
import { resolveSagaCommandContext } from './saga/shared';

function addSagaOptions(command: Command): Command {
  return addJsonOption(
    command
      .option('--path <directory>', 'Select a local project directory without backend access.')
      .option('--project-id <id>', 'Select a project from the configured backend.'),
  );
}

function initSaga(dependencies: AppDependencies) {
  return async function sagaInitAction(this: Command): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    const force = this.opts<{ force?: boolean }>().force === true;
    const report = installSagaResources(context.projectDirectory, loadSagaAssets(), force);

    context.io.stdout(context.outputJson ? formatJson(report) : formatSagaInitHuman(report));
    if (report.conflicts.length > 0) {
      throw new SagaResourceConflictError(report.conflicts);
    }
  };
}

function newSaga(dependencies: AppDependencies) {
  return async function sagaNewAction(this: Command, sagaId: string): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    validateSagaId(sagaId, context.sagaRoot);
    const toolPath = requireSagaResources(context.sagaRoot, context.selector);
    const metadata = createSagaWithCanonicalTool(
      sagaId,
      context.projectDirectory,
      context.sagaRoot,
      toolPath,
      context.env,
    );
    const result = {
      id: metadata.id,
      directory: path.join(context.sagaRoot, sagaId),
      metadata,
    };

    context.io.stdout(context.outputJson ? formatJson(result) : formatSagaNewHuman(result, toolPath));
  };
}

function listSagas(dependencies: AppDependencies) {
  return async function sagaListAction(this: Command): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    const payload = readSagaListPayload(context.sagaRoot);
    context.io.stdout(context.outputJson ? formatJson(payload) : formatSagaListHuman(payload));
  };
}

function showSagaStatus(dependencies: AppDependencies) {
  return async function sagaStatusAction(this: Command, sagaId: string): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    const sagaDirectory = requireSagaDirectory(context.sagaRoot, sagaId);
    const status = readSagaStatus(sagaId, sagaDirectory);
    const toolPath = path.join(context.sagaRoot, 'tools', 'saga.mjs');
    context.io.stdout(context.outputJson ? formatJson(status) : formatSagaStatusHuman(status, toolPath));
  };
}

function listSagaItems(dependencies: AppDependencies) {
  return async function sagaItemsAction(this: Command, sagaId: string): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    const payload = readSagaItemsPayload(context.sagaRoot, sagaId);
    context.io.stdout(context.outputJson ? formatJson(payload) : formatSagaItemsHuman(payload));
  };
}

export function registerSagaCommands(program: Command, dependencies: AppDependencies): void {
  const saga = program
    .command('saga')
    .description('Initialize, create, and inspect project-local Sagas.');

  addSagaOptions(saga.command('init').description('Install the managed Saga resources.'))
    .option('--force', 'Replace differing managed resources.')
    .action(initSaga(dependencies));
  addSagaOptions(saga.command('new <saga-id>').description('Create a Saga using the installed project tool.'))
    .action(newSaga(dependencies));
  addSagaOptions(saga.command('list').description('List active Sagas.'))
    .action(listSagas(dependencies));
  addSagaOptions(saga.command('status <saga-id>').description('Read a Saga status projection.'))
    .action(showSagaStatus(dependencies));
  addSagaOptions(saga.command('items <saga-id>').description('Read Saga plan items.'))
    .action(listSagaItems(dependencies));
}

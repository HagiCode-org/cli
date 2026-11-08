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
import { metadataLimitsText } from '../runtime/metadataOptions';
import { SagaResourceConflictError } from '../runtime/errors';
import { loadSagaAssets } from '../runtime/saga/assets';
import {
  createSagaNatively,
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
import { createSagaSessionAction } from './saga/session';
import { resolveSagaCommandContext } from './saga/shared';
import {
  amendSagaCommand,
  archiveSagaCommand,
  assertSagaOwner,
  blockSaga,
  checkSaga,
  claimSaga,
  freezeSaga,
  releaseSaga,
  setStatusSaga,
  tickSaga,
} from './saga/write';

function addSagaOptions(command: Command): Command {
  return addJsonOption(
    command
      .option('--path <directory>', 'Select a local project directory without backend access.')
      .option('--project-id <id>', 'Select a project from the configured backend.'),
  );
}

/** Execution token of a mutating command; with --project-id only SAGA_EXECUTION_TOKEN is accepted. */
function addExecutionTokenOption(command: Command): Command {
  return command.option('--token <token>', 'Execution token of the Saga owner (or set SAGA_EXECUTION_TOKEN).');
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
    const promptsPath = requireSagaResources(context.sagaRoot, context.selector);
    const metadata = createSagaNatively(sagaId, context.sagaRoot);
    const result = {
      id: metadata.id,
      directory: path.join(context.sagaRoot, sagaId),
      metadata,
    };

    context.io.stdout(context.outputJson ? formatJson(result) : formatSagaNewHuman(result, promptsPath));
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
    const promptsPath = path.join(context.sagaRoot, 'prompts');
    context.io.stdout(context.outputJson ? formatJson(status) : formatSagaStatusHuman(status, promptsPath));
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
  addSagaOptions(saga.command('new <saga-id>').description('Create a Saga using the installed project prompts.'))
    .action(newSaga(dependencies));
  addSagaOptions(saga.command('list').description('List active Sagas.'))
    .action(listSagas(dependencies));
  addSagaOptions(saga.command('status <saga-id>').description('Read a Saga status projection.'))
    .action(showSagaStatus(dependencies));
  addSagaOptions(saga.command('items <saga-id>').description('Read Saga plan items.'))
    .action(listSagaItems(dependencies));

  addSagaOptions(saga.command('claim <saga-id>').description('Claim exclusive execution ownership of a Saga.'))
    .requiredOption('--session <id>', 'Owner session identifier recorded in the lock.')
    .action(claimSaga(dependencies));
  addExecutionTokenOption(addSagaOptions(saga.command('assert-owner <saga-id>').description('Check the execution token before dispatch.')))
    .action(assertSagaOwner(dependencies));
  addExecutionTokenOption(addSagaOptions(saga.command('release <saga-id>').description('Release execution ownership after a paused or done snapshot.')))
    .option('--workers-settled', 'Confirm that every worker has settled.')
    .action(releaseSaga(dependencies));

  addExecutionTokenOption(addSagaOptions(saga.command('freeze <saga-id>').description('Freeze the Saga contract as revision 1, or the next revision after a merged amendment.')))
    .action(freezeSaga(dependencies));

  addExecutionTokenOption(addSagaOptions(saga.command('set-status <saga-id>').description('Write the runtime status snapshot (draft, planned, running, paused or done).')))
    .requiredOption('--state <state>', 'draft, planned, running, paused or done.')
    .option('--note <text>', 'Note stored with the snapshot.')
    .action(setStatusSaga(dependencies));
  addExecutionTokenOption(addSagaOptions(saga.command('tick <saga-id> <item-id>').description('Mark a plan item done once its PASS report and evidence exist.')))
    .action(tickSaga(dependencies));
  addExecutionTokenOption(addSagaOptions(saga.command('block <saga-id> <item-id> <reason>').description('Record why a plan item is blocked.')))
    .action(blockSaga(dependencies));
  addExecutionTokenOption(addSagaOptions(saga.command('amend <saga-id> <title> <text>').description('Append an open amendment to the Saga contract.')))
    .action(amendSagaCommand(dependencies));
  addExecutionTokenOption(addSagaOptions(saga.command('archive <saga-id>').description('Archive a finished Saga; --force archives unfinished work.')))
    .option('--force', 'Archive even when items are unfinished or amendments are open.')
    .action(archiveSagaCommand(dependencies));

  addSagaOptions(saga.command('check <saga-id>').description('Check the plan (--phase plan) or the frozen run contract (--phase run, the default).'))
    .option('--phase <phase>', 'plan or run.', 'run')
    .action(checkSaga(dependencies));

  const sessionGroup = saga.command('session').description('Create Saga Worker chat sessions and record them.');
  addJsonOption(sessionGroup.command('create').description('Create a Worker chat session marked with saga.* metadata and record it in runtime/sessions.md.'))
    .option('--saga <id>', 'Saga whose Worker this is.')
    .option('--title <title>', 'Title of the Worker chat session.')
    .option('--role <role>', 'implementation or verification.')
    .option('--master <session-id>', 'Session ID of the orchestrating (master) session.')
    .option('--item <id>', 'Plan item the Worker serves; recorded as "-" when omitted.')
    .option('--path <directory>', 'Project directory. The backend is called to find the registered project with this real path.')
    .option('--project-id <id>', 'Backend project ID.')
    .addHelpText('after', `\n${SESSION_CREATE_HELP}\n`)
    .action(createSagaSessionAction(dependencies));
}

const SESSION_CREATE_HELP = [
  'Metadata written to the session (userMetadata):',
  '  saga.id        the Saga ID',
  '  saga.role      always worker',
  '  saga.worker    the --role value',
  '  saga.master    the --master value',
  '  saga.item      the --item value (only when --item is given)',
  '',
  'The execution token comes only from SAGA_EXECUTION_TOKEN; --token is refused because it is the backend bearer token.',
  'The command creates and records the session. It sends no message and does not archive it (see hagi chat archive).',
  '',
  'Exit codes: 0 created and recorded; 1 refused, or the record could not be written (the session ID is named);',
  '2 usage error, nothing sent; 24 Saga not found.',
  '',
  metadataLimitsText(),
  '',
  'Example:',
  '  SAGA_EXECUTION_TOKEN=<token> hagi saga session create --saga demo --path <root> --title "T1 implementation"',
  '    --role implementation --master <your-session-id> --item T1',
].join('\n');

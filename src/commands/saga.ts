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
import { CliUsageError } from '../runtime/errors';
import { loadSagaAssets } from '../runtime/saga/assets';
import {
  createSagaNatively,
  requireSagaResources,
  validateSagaId,
} from '../runtime/saga/create';
import { installSagaResources } from '../runtime/saga/install';
import { isMethodName, METHOD_NAMES, readMethod } from '../runtime/saga/methods';
import {
  readSagaItemsPayload,
  readSagaListPayload,
  readSagaStatus,
  requireSagaDirectory,
} from '../runtime/saga/read';
import { createSagaSessionAction } from './saga/session';
import { appendOrchestratorLog, listWorkerSessions } from './saga/runRecords';
import { resolveSagaCommandContext } from './saga/shared';
import {
  amendSagaCommand,
  archiveSagaCommand,
  assertSagaOwner,
  blockSaga,
  checkSaga,
  claimSaga,
  freezeSaga,
  markSaga,
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
  };
}

/** Prints one published method from the installed package. It takes no selector, so it never touches a project. */
function showSagaMethod(dependencies: AppDependencies) {
  return async function sagaMethodAction(this: Command, name: string): Promise<void> {
    const options = this.optsWithGlobals<{ json?: boolean }>();
    if (!isMethodName(name)) {
      throw new CliUsageError(`Unknown Saga method ${JSON.stringify(name)}: use one of ${METHOD_NAMES.join(', ')}.`);
    }
    const method = readMethod(name, loadSagaAssets());
    const content = method.bytes.toString('utf8');
    dependencies.io.stdout(options.json === true
      ? formatJson({ name: method.name, sha256: method.sha256, content })
      : content);
  };
}

function newSaga(dependencies: AppDependencies) {
  return async function sagaNewAction(this: Command, sagaId: string): Promise<void> {
    const context = await resolveSagaCommandContext(this, dependencies);
    validateSagaId(sagaId, context.sagaRoot);
    requireSagaResources(context.sagaRoot, context.selector);
    const metadata = createSagaNatively(sagaId, context.sagaRoot);
    const result = {
      id: metadata.id,
      directory: path.join(context.sagaRoot, sagaId),
      metadata,
    };

    context.io.stdout(context.outputJson ? formatJson(result) : formatSagaNewHuman(result));
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
    context.io.stdout(context.outputJson ? formatJson(status) : formatSagaStatusHuman(status));
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

  addSagaOptions(saga.command('init').description('Install the Saga ignore rule. Method prompts come from the CLI (see method).'))
    .option('--force', 'Accepted for compatibility; no managed resource is replaced.')
    .action(initSaga(dependencies));
  addJsonOption(saga.command('method <name>').description(`Print a published Saga method (${METHOD_NAMES.join(', ')}) from the installed CLI.`))
    .action(showSagaMethod(dependencies));
  addSagaOptions(saga.command('new <saga-id>').description('Create a Saga in an initialized project.'))
    .action(newSaga(dependencies));
  addSagaOptions(saga.command('list').description('List active Sagas.'))
    .action(listSagas(dependencies));
  addSagaOptions(saga.command('status <saga-id>').description('Read a Saga status projection.'))
    .action(showSagaStatus(dependencies));
  addSagaOptions(saga.command('items <saga-id>').description('Read Saga plan items.'))
    .action(listSagaItems(dependencies));

  addSagaOptions(saga.command('claim <saga-id>').description('Claim exclusive execution ownership of a Saga.'))
    .requiredOption('--session <id>', 'Owner session identifier recorded in the lock.')
    .option(
      '--no-mark-session',
      'Do not add saga.id and saga.role=master to the owner session (by default the claim marks it, so session lists group it with its Workers).',
    )
    .action(claimSaga(dependencies));
  addSagaOptions(saga.command('mark <saga-id>').description('Mark a planning session as the Saga master (saga.id and saga.role=master). Takes no ownership.'))
    .option('--session <id>', 'Session to mark (or set HAGI_SESSION_ID).')
    .addHelpText('after', `\n${SAGA_MARK_HELP}\n`)
    .action(markSaga(dependencies));
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
    .option('--hero <name-or-id>', 'Hero the Worker runs, by name or ID. A GUID is an ID, any other value is a name. Without it the backend picks the Hero.')
    .option('--path <directory>', 'Project directory. The backend is called to find the registered project with this real path.')
    .option('--project-id <id>', 'Backend project ID.')
    .addHelpText('after', `\n${SESSION_CREATE_HELP}\n`)
    .action(createSagaSessionAction(dependencies));
  addSagaOptions(sessionGroup.command('list <saga-id>').description('List the Worker sessions recorded in runtime/sessions.md. Read-only.'))
    .action(listWorkerSessions(dependencies));

  const logGroup = saga.command('log').description('Write the orchestrator run record of a Saga.');
  addExecutionTokenOption(addSagaOptions(logGroup.command('append <saga-id>').description('Append one line to runtime/orchestrator-log.md under the execution token.')))
    .requiredOption('--message <text>', 'Text of the log line. Whitespace and line breaks collapse to one line.')
    .action(appendOrchestratorLog(dependencies));
}

const SAGA_MARK_HELP = [
  'Writes exactly the pair claim writes, saga.id=<saga-id> and saga.role=master, to the session user metadata. Nothing else',
  'is written: it takes no execution token, creates or changes no lock or Saga file, and takes no ownership.',
  '',
  'The session is --session, else HAGI_SESSION_ID. With neither, the command exits 2 before any backend or file access.',
  'The backend call gives up after 10 seconds. Marking the same session for the same Saga again succeeds unchanged. A session',
  'already marked for another Saga is not overwritten (add-only); that refusal is a failed mark.',
  '',
  'Exit codes: 0 marked; 1 mark failed (rejected, conflict, backend unreachable or no answer within 10 s, with a one-line',
  'reason); 2 usage error, nothing sent; 24 Saga not found.',
  '',
  'Example:',
  '  hagi saga mark demo --path <root> --session <your-session-id> --json',
].join('\n');

const SESSION_CREATE_HELP = [
  'Metadata written to the session (userMetadata):',
  '  saga.id        the Saga ID',
  '  saga.role      always worker',
  '  saga.worker    the --role value',
  '  saga.master    the --master value',
  '  saga.item      the --item value (only when --item is given)',
  '',
  '--hero binds the Worker session to a Hero: a GUID is sent as a Hero ID, any other value as a Hero name. A Hero the backend',
  'rejects (an unknown name, or both a Hero ID and a name) fails with the backend message and records nothing. The Hero is not',
  'written to the metadata or to sessions.md.',
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

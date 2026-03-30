import { Command, CommanderError } from 'commander';
import { registerProposalCommands } from './commands/proposal';
import {
  createDefaultDependencies,
  addGlobalApiOptions,
  type AppDependencies,
} from './runtime/commandContext';
import { EXIT_CODES, normalizeCliError, renderCliError } from './runtime/errors';

function inferJsonMode(argv: readonly string[]): boolean {
  return argv.includes('--json');
}

export function createCliApp(
  dependencies: AppDependencies = createDefaultDependencies(),
  jsonMode = false,
): Command {
  const program = new Command();

  program
    .name('hagi')
    .description('HagiCode CLI for proposal session management.')
    .showHelpAfterError()
    .exitOverride();

  program.configureOutput({
    writeOut: value => {
      dependencies.io.stdout(value);
    },
    writeErr: value => {
      if (!jsonMode) {
        dependencies.io.stderr(value);
      }
    },
    getOutHelpWidth: () => 100,
    getErrHelpWidth: () => 100,
  });

  addGlobalApiOptions(program);
  registerProposalCommands(program, dependencies);

  return program;
}

function handleCommanderError(
  error: CommanderError,
  dependencies: AppDependencies,
  jsonMode: boolean,
): number {
  if (error.exitCode === 0 || error.code === 'commander.helpDisplayed' || error.code === 'commander.version') {
    return 0;
  }

  if (jsonMode) {
    dependencies.io.stderr(
      renderCliError(
        {
          exitCode: EXIT_CODES.USAGE,
          message: error.message,
        },
        { json: true },
      ),
    );
  }

  return EXIT_CODES.USAGE;
}

export async function runCli(
  argv: readonly string[] = process.argv,
  dependencies: AppDependencies = createDefaultDependencies(),
): Promise<number> {
  const jsonMode = inferJsonMode(argv);
  const program = createCliApp(dependencies, jsonMode);

  try {
    await program.parseAsync([...argv]);
    return 0;
  } catch (error) {
    if (error instanceof CommanderError) {
      return handleCommanderError(error, dependencies, jsonMode);
    }

    const cliError = normalizeCliError(error);
    dependencies.io.stderr(renderCliError(cliError, { json: jsonMode }));
    return cliError.exitCode;
  }
}

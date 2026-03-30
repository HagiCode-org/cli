#!/usr/bin/env node

import { runCli } from './main';
import { EXIT_CODES } from './runtime/errors';

runCli()
  .then(exitCode => {
    if (exitCode !== 0) {
      process.exitCode = exitCode;
    }
  })
  .catch(error => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = EXIT_CODES.UNKNOWN;
  });

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// The tests do not depend on the library build in vite.config.ts, so this file only bounds memory.
const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string };

export default defineConfig({
  define: {
    // Same build-time define as vite.config.ts, so tests see the CLI version that the built package reports.
    __HAGI_CLI_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    // Memory bound: cap the worker count and give every worker a V8 heap ceiling, so a leaking test file fails with an OOM
    // instead of exhausting the machine.
    maxWorkers: 4,
    execArgv: ['--max-old-space-size=2048'],
  },
});

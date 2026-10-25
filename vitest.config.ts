import { defineConfig } from 'vitest/config';

// The tests do not depend on the library build in vite.config.ts, so this file only bounds memory.
export default defineConfig({
  test: {
    // Memory bound: cap the worker count and give every worker a V8 heap ceiling, so a leaking test file fails with an OOM
    // instead of exhausting the machine.
    maxWorkers: 4,
    execArgv: ['--max-old-space-size=2048'],
  },
});

import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type IncomingMessage, type RequestListener, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runCli } from '../../src/main';
import { createDefaultDependencies, type CliIo } from '../../src/runtime/commandContext';
import { EXIT_CODES } from '../../src/runtime/errors';
import { createDependencies } from '../commands/testHelpers';

type RunningServer = {
  url: string;
  server: Server;
};

function captureIo(): { io: CliIo; stdout: string[]; stderr: string[] } {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      stdout: value => {
        stdout.push(value);
      },
      stderr: value => {
        stderr.push(value);
      },
    },
    stdout,
    stderr,
  };
}

async function startServer(handler: RequestListener): Promise<RunningServer> {
  const server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, server };
}

async function stopServer(running: RunningServer): Promise<void> {
  running.server.closeAllConnections();
  await new Promise<void>(resolve => running.server.close(() => resolve()));
}

/** A base URL whose port was just released, so nothing listens on it. */
async function closedPortUrl(): Promise<string> {
  const running = await startServer(() => undefined);
  const url = running.url;
  await stopServer(running);
  return url;
}

describe('backend connection', () => {
  let configHome: string;
  let running: RunningServer | undefined;

  beforeEach(() => {
    configHome = mkdtempSync(join(tmpdir(), 'hagi-connection-'));
    running = undefined;
  });

  afterEach(async () => {
    if (running) {
      await stopServer(running);
    }
    rmSync(configHome, { recursive: true, force: true });
  });

  it('sends operation requests to the resolved base URL with no Authorization header', async () => {
    const seen: Array<{ path?: string; authorization?: string }> = [];
    running = await startServer((request: IncomingMessage, response: ServerResponse) => {
      seen.push({ path: request.url, authorization: request.headers.authorization });
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          projects: [],
          metadata: { timestamp: '2026-10-16T00:00:00Z', totalProjects: 0, totalRepositories: 0, failedProjects: 0, hasFailures: false },
        }),
      );
    });

    const { io } = captureIo();
    const exitCode = await runCli(
      ['node', 'hagi', '--base-url', running.url, 'project', 'list', '--json'],
      createDefaultDependencies({ XDG_CONFIG_HOME: configHome }, io),
    );

    expect(exitCode).toBe(0);
    expect(seen).toHaveLength(1);
    expect(seen[0].path).toBe('/api/DataAggregation');
    expect(seen[0].authorization).toBeUndefined();
  });

  it('attaches a bearer token only when the caller passes --token', async () => {
    const seen: Array<string | undefined> = [];
    running = await startServer((request, response) => {
      seen.push(request.headers.authorization);
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          projects: [],
          metadata: { timestamp: '2026-10-16T00:00:00Z', totalProjects: 0, totalRepositories: 0, failedProjects: 0, hasFailures: false },
        }),
      );
    });

    const { io } = captureIo();
    await runCli(
      ['node', 'hagi', '--base-url', running.url, '--token', 'explicit-token', 'project', 'list', '--json'],
      createDefaultDependencies({ XDG_CONFIG_HOME: configHome }, io),
    );

    expect(seen).toEqual(['Bearer explicit-token']);
  });

  it('reports an unreachable backend with the base URL and the transport exit code', async () => {
    const url = await closedPortUrl();
    const { io, stderr } = captureIo();

    const exitCode = await runCli(
      ['node', 'hagi', '--base-url', url, 'project', 'list'],
      createDefaultDependencies({ XDG_CONFIG_HOME: configHome }, io),
    );

    expect(exitCode).toBe(EXIT_CODES.TRANSPORT);
    const output = stderr.join('');
    expect(output).toContain(`Cannot reach HagiCode backend at ${url}`);
    expect(output).not.toContain('status=');
  });

  it('keeps unreachable output distinct from HTTP error output in JSON mode', async () => {
    const unreachable = await closedPortUrl();
    const unreachableCapture = captureIo();
    const unreachableExit = await runCli(
      ['node', 'hagi', '--base-url', unreachable, 'project', 'list', '--json'],
      createDefaultDependencies({ XDG_CONFIG_HOME: configHome }, unreachableCapture.io),
    );

    running = await startServer((_request, response) => {
      response.writeHead(500, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Backend exploded' }));
    });
    const httpCapture = captureIo();
    const httpExit = await runCli(
      ['node', 'hagi', '--base-url', running.url, 'project', 'list', '--json'],
      createDefaultDependencies({ XDG_CONFIG_HOME: configHome }, httpCapture.io),
    );

    expect(unreachableExit).toBe(EXIT_CODES.TRANSPORT);
    expect(httpExit).toBe(EXIT_CODES.HTTP_SERVER_ERROR);
    expect(unreachableExit).not.toBe(httpExit);

    const unreachableError = JSON.parse(unreachableCapture.stderr.join('')).error;
    const httpError = JSON.parse(httpCapture.stderr.join('')).error;
    expect(unreachableError.message).toContain(unreachable);
    expect(httpError.status).toBe(500);
    expect(httpError.message).toBe('Backend exploded');
    expect(unreachableError.message).not.toBe(httpError.message);
  });

  it('fails before any backend call when no base URL is configured', async () => {
    const { dependencies, api, stderr } = createDependencies();
    dependencies.env = { XDG_CONFIG_HOME: configHome };

    const exitCode = await runCli(['node', 'hagi', 'project', 'list'], dependencies);

    expect(exitCode).toBe(EXIT_CODES.USAGE);
    expect(api.listProjects).not.toHaveBeenCalled();
    expect(stderr.join('')).toContain('--base-url');
  });
});

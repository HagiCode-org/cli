import { mkdtempSync, rmSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Code, ConnectError, type HandlerContext } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fromJson } from '@bufbuild/protobuf';
import { GetAggregatedDataResponseSchema, StatisticsService } from '../../src/generated/grpc/hagicode/platform/v1/statistics_pb';
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

type AggregationHandler = (context: HandlerContext) => void;

/** A real gRPC-Web endpoint under /grpc whose GetAggregatedData runs `onCall` (which may throw a ConnectError). */
async function startServer(onCall: AggregationHandler = () => undefined): Promise<RunningServer> {
  const handler = connectNodeAdapter({
    requestPathPrefix: '/grpc',
    routes: router => {
      router.service(StatisticsService, {
        getAggregatedData: (_request, context) => {
          onCall(context);
          return fromJson(GetAggregatedDataResponseSchema, { result: { projects: [], metadata: { totalProjects: 0, totalRepositories: 0, failedProjects: 0, hasFailures: false } } }, { ignoreUnknownFields: true });
        },
      } as never);
    },
  });
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

  it('sends operation requests to the resolved base URL over gRPC-Web with no Authorization header', async () => {
    const seen: Array<{ authorization: string | null; client: string | null }> = [];
    running = await startServer(context => {
      seen.push({
        authorization: context.requestHeader.get('authorization'),
        client: context.requestHeader.get('x-hagi-client'),
      });
    });

    const { io, stdout } = captureIo();
    const exitCode = await runCli(
      ['node', 'hagi', '--base-url', running.url, 'project', 'list', '--json'],
      createDefaultDependencies({ XDG_CONFIG_HOME: configHome }, io),
    );

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.join(''))).toBeDefined();
    expect(seen).toHaveLength(1);
    expect(seen[0].authorization).toBeNull();
    expect(seen[0].client).toMatch(/^cli\//);
  });

  it('attaches a bearer token only when the caller passes --token', async () => {
    const seen: Array<string | null> = [];
    running = await startServer(context => {
      seen.push(context.requestHeader.get('authorization'));
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

    running = await startServer(() => {
      throw new ConnectError('Backend exploded', Code.Internal);
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

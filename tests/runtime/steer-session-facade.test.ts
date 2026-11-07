import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fromJson, type JsonValue, type Message } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  SessionMessagingService,
  SteerSessionResponseSchema,
} from '../../src/generated/grpc/hagicode/session/v1/session_messaging_pb';
import { configureApiRuntime } from '../../src/runtime/apiRuntime';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';

/**
 * Facade check for `steerSession`: a real gRPC-Web client talks to a local server that counts every RPC it receives.
 * One facade call must reach the server as exactly one `SteerSession` and no other session-messaging RPC.
 */

type SteerCall = { sessionId: string; content: string | undefined };

let server: Server;
let baseUrl: string;
let steerCalls: SteerCall[];
let otherCalls: string[];
let failWithNotFound: boolean;

beforeAll(async () => {
  const handler = connectNodeAdapter({
    requestPathPrefix: '/grpc',
    routes: router => {
      router.service(SessionMessagingService, {
        steerSession: (request: { sessionId: string; body?: { content?: string } }): Message => {
          steerCalls.push({ sessionId: request.sessionId, content: request.body?.content });
          if (failWithNotFound) {
            throw new ConnectError('Session not found', Code.NotFound);
          }
          return fromJson(SteerSessionResponseSchema, {
            result: { outcome: 'steered', messageId: 'message-1' },
          } as JsonValue, { ignoreUnknownFields: true });
        },
        postSessionMessage: (): Message => {
          otherCalls.push('PostSessionMessage');
          throw new ConnectError('unexpected call', Code.Unimplemented);
        },
      } as never);
    },
  });
  server = createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
});

beforeEach(() => {
  steerCalls = [];
  otherCalls = [];
  failWithNotFound = false;
  configureApiRuntime({ baseUrl }, {});
});

describe('steerSession facade method', () => {
  it('makes exactly one SteerSession call and returns the outcome and message id', async () => {
    const api = createGrpcHagiApi();

    const response = await api.steerSession('session-1', { content: 'hello' });

    expect(steerCalls).toEqual([{ sessionId: 'session-1', content: 'hello' }]);
    expect(otherCalls).toEqual([]);
    expect(response).toMatchObject({ outcome: 'steered', messageId: 'message-1' });
  });

  it('propagates a ConnectError from the backend unchanged', async () => {
    failWithNotFound = true;
    const api = createGrpcHagiApi();

    const failure = await api.steerSession('missing', { content: 'hello' }).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ConnectError);
    expect((failure as ConnectError).code).toBe(Code.NotFound);
    expect(steerCalls).toHaveLength(1);
    expect(otherCalls).toEqual([]);
  });
});

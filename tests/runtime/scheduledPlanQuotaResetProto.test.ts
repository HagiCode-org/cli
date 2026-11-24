import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fromJson, type JsonValue, type Message } from '@bufbuild/protobuf';
import { Code, ConnectError } from '@connectrpc/connect';
import { connectNodeAdapter } from '@connectrpc/connect-node';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { dtoToProto, protoToDto } from '../../src/runtime/grpc/mappers';
import {
  CancelScheduledPlanQuotaTriggerResponseSchema,
  ConfirmScheduledPlanQuotaTriggerResponseSchema,
  ScheduledPlanResponseSchema,
  ScheduledPlanSaveRequestSchema,
  ScheduledPlansService,
} from '../../src/generated/grpc/hagicode/community/v1/scheduled_plans_pb';
import { configureApiRuntime } from '../../src/runtime/apiRuntime';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';

// The quota-reset condition and the trigger state travel as proto fields. dtoToProto ignores unknown properties, so a
// field the generated schema lacks would be dropped silently. These tests pin that both directions keep them.
const quotaReset = {
  window: 'claudeFiveHour',
  minRemainingPercent: 20,
  maxMinutesBeforeReset: 60,
  requireManualConfirmation: true,
  skipConfirmationDuringUnattendedHours: false,
};

describe('quota-reset schedule over the gRPC mapping', () => {
  it('sends the quota-reset condition as proto fields', () => {
    const message = dtoToProto(ScheduledPlanSaveRequestSchema, {
      schedule: { mode: 'quotaReset', timeZone: 'America/Los_Angeles', quotaReset },
    });

    expect(message.schedule?.mode).toBe('quotaReset');
    expect(message.schedule?.quotaReset).toMatchObject(quotaReset);
  });

  it('returns the quota-reset condition from the backend response', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, {
      id: 'plan-1',
      schedule: { mode: 'quotaReset', timeZone: 'America/Los_Angeles', quotaReset },
    });

    const dto = protoToDto<{ schedule?: { quotaReset?: Record<string, unknown> } }>(ScheduledPlanResponseSchema, response);
    expect(dto.schedule?.quotaReset).toEqual(quotaReset);
  });

  it('carries lastTriggeredResetAt and the pending trigger both ways as RFC 3339 instants', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, {
      id: 'plan-1',
      lastTriggeredResetAt: '2026-11-13T08:00:00Z',
      pendingQuotaTrigger: { raisedAt: '2026-11-14T08:00:00Z', windowResetAt: '2026-11-14T13:00:00Z' },
    });

    expect(response.lastTriggeredResetAt?.seconds).toBe(BigInt(Date.parse('2026-11-13T08:00:00Z') / 1000));
    expect(response.pendingQuotaTrigger?.raisedAt).toBeDefined();
    expect(response.pendingQuotaTrigger?.windowResetAt).toBeDefined();

    const dto = protoToDto<Record<string, unknown>>(ScheduledPlanResponseSchema, response);
    expect(dto.lastTriggeredResetAt).toBe('2026-11-13T08:00:00Z');
    expect(dto.pendingQuotaTrigger).toEqual({
      raisedAt: '2026-11-14T08:00:00Z',
      windowResetAt: '2026-11-14T13:00:00Z',
    });
  });

  it('leaves the trigger fields absent when the backend sends none', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, { id: 'plan-1' });

    const dto = protoToDto<Record<string, unknown>>(ScheduledPlanResponseSchema, response);
    expect(dto).not.toHaveProperty('pendingQuotaTrigger');
    expect(dto).not.toHaveProperty('lastTriggeredResetAt');
  });
});

describe('quota trigger RPCs over the facade', () => {
  let server: Server;
  let baseUrl: string;
  let confirmCalls: string[];
  let cancelCalls: string[];
  let otherCalls: string[];
  let confirmFailure: Code | undefined;

  beforeAll(async () => {
    const handler = connectNodeAdapter({
      requestPathPrefix: '/grpc',
      routes: router => {
        router.service(ScheduledPlansService, {
          confirmScheduledPlanQuotaTrigger: (request: { id: string }): Message => {
            confirmCalls.push(request.id);
            if (confirmFailure !== undefined) {
              throw new ConnectError('No quota trigger is waiting.', confirmFailure);
            }
            return fromJson(ConfirmScheduledPlanQuotaTriggerResponseSchema, {
              result: { planId: request.id },
            } as JsonValue, { ignoreUnknownFields: true });
          },
          cancelScheduledPlanQuotaTrigger: (request: { id: string }): Message => {
            cancelCalls.push(request.id);
            return fromJson(CancelScheduledPlanQuotaTriggerResponseSchema, {
              result: {
                id: request.id,
                lastTriggeredResetAt: '2026-11-13T08:00:00Z',
              },
            } as JsonValue, { ignoreUnknownFields: true });
          },
          runScheduledPlan: (): Message => {
            otherCalls.push('RunScheduledPlan');
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
    confirmCalls = [];
    cancelCalls = [];
    otherCalls = [];
    confirmFailure = undefined;
    configureApiRuntime({ baseUrl }, {});
  });

  it('confirmPlanQuotaTrigger makes one ConfirmScheduledPlanQuotaTrigger call and returns the accepted run', async () => {
    const api = createGrpcHagiApi();

    const accepted = await api.confirmPlanQuotaTrigger('plan-1');

    expect(confirmCalls).toEqual(['plan-1']);
    expect(cancelCalls).toEqual([]);
    expect(otherCalls).toEqual([]);
    expect(accepted).toMatchObject({ planId: 'plan-1' });
  });

  it('confirmPlanQuotaTrigger propagates a conflict from the backend as a ConnectError', async () => {
    confirmFailure = Code.FailedPrecondition;
    const api = createGrpcHagiApi();

    const failure = await api.confirmPlanQuotaTrigger('plan-1').catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ConnectError);
    expect((failure as ConnectError).code).toBe(Code.FailedPrecondition);
    expect(confirmCalls).toHaveLength(1);
  });

  it('cancelPlanQuotaTrigger makes one CancelScheduledPlanQuotaTrigger call and returns the plan', async () => {
    const api = createGrpcHagiApi();

    const plan = await api.cancelPlanQuotaTrigger('plan-1');

    expect(cancelCalls).toEqual(['plan-1']);
    expect(confirmCalls).toEqual([]);
    expect(otherCalls).toEqual([]);
    expect(plan).toMatchObject({ id: 'plan-1', lastTriggeredResetAt: '2026-11-13T08:00:00Z' });
  });
});

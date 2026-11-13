import { describe, expect, it } from 'vitest';
import { dtoToProto, protoToDto } from '../../src/runtime/grpc/mappers';
import {
  ScheduledPlanResponseSchema,
  ScheduledPlanSaveRequestSchema,
} from '../../src/generated/grpc/hagicode/community/v1/scheduled_plans_pb';

// The interval fields travel as proto Timestamp and int32. dtoToProto ignores unknown properties, so a field the generated
// schema lacks would be dropped silently. These tests pin that the interval rule survives both directions.
describe('interval repeat rule over the gRPC mapping', () => {
  it('sends the window, first trigger and interval as proto fields', () => {
    const message = dtoToProto(ScheduledPlanSaveRequestSchema, {
      schedule: {
        mode: 'recurring',
        timeZone: 'America/Los_Angeles',
        repeat: {
          rule: 'interval',
          windowStart: '2026-11-14T00:00:00-08:00',
          windowEnd: '2026-11-14T23:59:00-08:00',
          firstRunAt: '2026-11-14T00:00:00-08:00',
          intervalMinutes: 180,
        },
      },
    });

    expect(message.schedule?.repeat?.rule).toBe('interval');
    expect(message.schedule?.repeat?.intervalMinutes).toBe(180);
    expect(message.schedule?.repeat?.windowStart?.seconds).toBe(BigInt(Date.parse('2026-11-14T08:00:00Z') / 1000));
    expect(message.schedule?.repeat?.windowEnd).toBeDefined();
    expect(message.schedule?.repeat?.firstRunAt).toBeDefined();
  });

  it('returns the interval fields as the UTC instants and minutes the backend sent', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, {
      id: 'plan-1',
      schedule: {
        mode: 'recurring',
        timeZone: 'America/Los_Angeles',
        repeat: {
          rule: 'interval',
          windowStart: '2026-11-14T08:00:00Z',
          windowEnd: '2026-11-15T07:59:00Z',
          firstRunAt: '2026-11-14T08:00:00Z',
          intervalMinutes: 180,
        },
      },
    });

    const dto = protoToDto<{ schedule?: { repeat?: Record<string, unknown> } }>(ScheduledPlanResponseSchema, response);
    expect(dto.schedule?.repeat).toEqual({
      rule: 'interval',
      weekdays: [],
      windowStart: '2026-11-14T08:00:00Z',
      windowEnd: '2026-11-15T07:59:00Z',
      firstRunAt: '2026-11-14T08:00:00Z',
      intervalMinutes: 180,
    });
  });
});

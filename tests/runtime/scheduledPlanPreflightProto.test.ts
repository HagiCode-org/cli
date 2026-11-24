import { describe, expect, it } from 'vitest';
import { dtoToProto, protoToDto } from '../../src/runtime/grpc/mappers';
import {
  ScheduledPlanResponseSchema,
  ScheduledPlanSaveRequestSchema,
} from '../../src/generated/grpc/hagicode/community/v1/scheduled_plans_pb';

// The preflight check (a runtime, a script file and an optional timeout) travels as a proto message. dtoToProto ignores
// unknown properties, so a field the generated schema lacks would be dropped silently. These tests pin that the preflight
// survives both directions, that an unset timeout stays unset, and that `preflight: null` sends no preflight at all.
describe('preflight over the gRPC mapping', () => {
  it('sends runtime, file and timeout on a save request', () => {
    const message = dtoToProto(ScheduledPlanSaveRequestSchema, {
      name: 'Nightly',
      preflight: { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 },
    });

    expect(message.preflight?.runtime).toBe('node');
    expect(message.preflight?.file).toBe('scripts/check.mjs');
    expect(message.preflight?.timeoutSeconds).toBe(120);
  });

  it('sends a preflight without a timeout as an unset timeout', () => {
    const message = dtoToProto(ScheduledPlanSaveRequestSchema, {
      preflight: { runtime: 'bash', file: 'scripts/check.sh' },
    });

    expect(message.preflight?.runtime).toBe('bash');
    expect(message.preflight?.file).toBe('scripts/check.sh');
    expect(message.preflight?.timeoutSeconds).toBeUndefined();
  });

  it('sends no preflight when the save request carries null', () => {
    const message = dtoToProto(ScheduledPlanSaveRequestSchema, { name: 'Nightly', preflight: null });

    expect(message.preflight).toBeUndefined();
  });

  it('returns the preflight of a plan response as the DTO the backend sent', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, {
      id: 'plan-1',
      preflight: { runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 },
    });

    const dto = protoToDto<{ preflight?: Record<string, unknown> }>(ScheduledPlanResponseSchema, response);
    expect(dto.preflight).toEqual({ runtime: 'node', file: 'scripts/check.mjs', timeoutSeconds: 120 });
  });

  it('returns a preflight without a timeout without inventing one', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, {
      id: 'plan-1',
      preflight: { runtime: 'bash', file: 'scripts/check.sh' },
    });

    const dto = protoToDto<{ preflight?: Record<string, unknown> }>(ScheduledPlanResponseSchema, response);
    expect(dto.preflight).toEqual({ runtime: 'bash', file: 'scripts/check.sh' });
    expect(dto.preflight).not.toHaveProperty('timeoutSeconds');
  });

  it('returns no preflight key when the plan has none', () => {
    const response = dtoToProto(ScheduledPlanResponseSchema, { id: 'plan-1' });

    const dto = protoToDto<{ preflight?: unknown }>(ScheduledPlanResponseSchema, response);
    expect(dto.preflight).toBeUndefined();
  });
});

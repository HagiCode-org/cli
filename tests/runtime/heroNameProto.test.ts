import { describe, expect, it } from 'vitest';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';
import { dtoToProto } from '../../src/runtime/grpc/mappers';
import {
  CreateChatSessionRequestSchema,
  CreateHagiTaskSessionRequestSchema,
} from '../../src/generated/grpc/hagicode/session/v1/sessions_pb';

// The facade sends both create calls through dtoToProto, which ignores unknown properties. A dropped heroName would
// silently create the session with the server-picked Hero, so these tests pin that the field reaches the proto message.
describe('heroName over the gRPC request mapping', () => {
  it('carries heroName of a chat create request into the proto hero_name field', () => {
    const message = dtoToProto(CreateChatSessionRequestSchema, {
      title: 'Chat',
      projectId: 'project-1',
      heroName: 'Nova',
    });

    expect(message.heroName).toBe('Nova');
    expect(message.heroId).toBeUndefined();
  });

  it('carries heroName of a HagiTask create request into the proto hero_name field', () => {
    const message = dtoToProto(CreateHagiTaskSessionRequestSchema, {
      title: 'Task',
      projectId: 'project-1',
      heroName: 'Nova',
    });

    expect(message.heroName).toBe('Nova');
    expect(message.heroId).toBeUndefined();
  });

  it('leaves heroName absent when the request does not name a Hero', () => {
    const chat = dtoToProto(CreateChatSessionRequestSchema, { title: 'Chat', projectId: 'project-1', heroId: 'hero-1' });
    const task = dtoToProto(CreateHagiTaskSessionRequestSchema, { title: 'Task', projectId: 'project-1', heroId: 'hero-1' });

    expect(chat.heroName).toBeUndefined();
    expect(task.heroName).toBeUndefined();
    expect(chat.heroId).toBe('hero-1');
    expect(task.heroId).toBe('hero-1');
  });

  it('keeps the chat and HagiTask create methods on the gRPC facade', () => {
    const api = createGrpcHagiApi();

    expect(typeof api.createChatSession).toBe('function');
    expect(typeof api.createHagiTaskSession).toBe('function');
  });
});

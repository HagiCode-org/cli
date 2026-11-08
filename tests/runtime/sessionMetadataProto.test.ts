import { create } from '@bufbuild/protobuf';
import { describe, expect, it } from 'vitest';
import { createGrpcHagiApi } from '../../src/runtime/hagiApi';
import { dtoToProto, protoToDto } from '../../src/runtime/grpc/mappers';
import {
  CreateChatSessionRequestSchema,
  CreateSessionRequestSchema,
  SessionResponseDtoSchema,
} from '../../src/generated/grpc/hagicode/session/v1/sessions_pb';

// dtoToProto ignores unknown properties, so a request field the generated schema lacks would be dropped without an error.
// These tests pin that the converted proto message holds the metadata map.
describe('session metadata over the gRPC request mapping', () => {
  it('carries the metadata map of a chat create request into the proto message', () => {
    const message = dtoToProto(CreateChatSessionRequestSchema, {
      title: 'Chat',
      projectId: 'project-1',
      metadata: { role: 'master', batch: '3' },
    });

    expect(message.title).toBe('Chat');
    expect(message.metadata).toEqual({ role: 'master', batch: '3' });
  });

  it('carries the metadata map of a proposal create request into the proto message', () => {
    const message = dtoToProto(CreateSessionRequestSchema, {
      title: 'Proposal',
      projectId: 'project-1',
      chiefComplaint: 'complaint',
      metadata: { role: 'worker', master: 'abc', note: 'a=b' },
    });

    expect(message.chiefComplaint).toBe('complaint');
    expect(message.metadata).toEqual({ role: 'worker', master: 'abc', note: 'a=b' });
  });

  it('leaves the metadata map empty when the request has none', () => {
    const message = dtoToProto(CreateSessionRequestSchema, { title: 'Proposal', projectId: 'project-1' });

    expect(message.metadata).toEqual({});
  });

  it('reads the response user_metadata map back as userMetadata', () => {
    const message = create(SessionResponseDtoSchema, { userMetadata: { role: 'master' } });
    const dto = protoToDto<{ userMetadata?: Record<string, string> }>(SessionResponseDtoSchema, message);

    expect(dto.userMetadata).toEqual({ role: 'master' });
  });

  it('keeps the chat and proposal create methods on the gRPC facade', () => {
    const api = createGrpcHagiApi();

    expect(typeof api.createChatSession).toBe('function');
    expect(typeof api.createProposalSession).toBe('function');
  });
});

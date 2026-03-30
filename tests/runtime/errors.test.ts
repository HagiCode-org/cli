import { describe, expect, it } from 'vitest';
import { ApiError } from '../../src/generated/api/core/ApiError';
import {
  CliUsageError,
  EXIT_CODES,
  normalizeCliError,
  renderCliError,
} from '../../src/runtime/errors';

function createApiError(status: number, body: unknown): ApiError {
  return new ApiError(
    {
      method: 'GET',
      url: '/api/Sessions',
      path: {},
      query: {},
      formData: {},
      headers: {},
      cookies: {},
      errors: {},
    },
    {
      url: 'https://api.example/api/Sessions',
      ok: false,
      status,
      statusText: 'Bad Request',
      body,
    },
    'Backend error',
  );
}

describe('errors', () => {
  it('maps backend HTTP errors to stable exit codes', () => {
    expect(normalizeCliError(createApiError(400, { error: 'Bad request' }))).toMatchObject({
      exitCode: EXIT_CODES.HTTP_BAD_REQUEST,
      status: 400,
      message: 'Bad request',
    });

    expect(normalizeCliError(createApiError(404, { error: 'Missing' }))).toMatchObject({
      exitCode: EXIT_CODES.HTTP_NOT_FOUND,
      status: 404,
      message: 'Missing',
    });

    expect(normalizeCliError(createApiError(409, { error: 'Conflict' }))).toMatchObject({
      exitCode: EXIT_CODES.HTTP_CONFLICT,
      status: 409,
      message: 'Conflict',
    });
  });

  it('keeps backend metadata visible in text and json output', () => {
    const payload = normalizeCliError(
      createApiError(400, {
        error: 'Validation failed',
        errorCode: 'BAD_INPUT',
        correlationId: 'corr-1',
      }),
    );

    expect(renderCliError(payload)).toContain('Validation failed');
    expect(renderCliError(payload)).toContain('errorCode=BAD_INPUT');
    expect(renderCliError(payload, { json: true })).toContain('"status": 400');
    expect(renderCliError(payload, { json: true })).toContain('"correlationId": "corr-1"');
  });

  it('treats usage errors separately from backend failures', () => {
    expect(normalizeCliError(new CliUsageError('Missing required input'))).toEqual({
      exitCode: EXIT_CODES.USAGE,
      message: 'Missing required input',
    });
  });
});

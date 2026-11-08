import { Code, ConnectError } from '@connectrpc/connect';
import { describe, expect, it } from 'vitest';
import { ErrorDetailSchema } from '../../src/generated/grpc/hagicode/common/v1/error_detail_pb';
import { createApiError } from '../commands/testHelpers';
import {
  CliLockLostError,
  CliOperationFailedError,
  CliSagaRefusalError,
  CliUsageError,
  CliWaitTimeoutError,
  SagaResourceConflictError,
  EXIT_CODES,
  isTransientLockFailure,
  normalizeCliError,
  renderCliError,
  toLockLostError,
} from '../../src/runtime/errors';

describe('errors', () => {
  it('maps a Saga refusal to exit code 1 and prints every reason in human and JSON modes', () => {
    expect(EXIT_CODES.REFUSED).toBe(1);
    const payload = normalizeCliError(new CliSagaRefusalError(['open question A', 'open question B']));
    expect(payload).toMatchObject({ exitCode: 1, details: { errors: ['open question A', 'open question B'] } });
    expect(renderCliError(payload)).toContain('  - open question A\n  - open question B');
    expect(JSON.parse(renderCliError(payload, { json: true })).error).toMatchObject({ exitCode: 1 });
  });

  it('keeps the existing exit codes for usage, operation and conflict failures', () => {
    expect(normalizeCliError(new CliUsageError('bad'))).toMatchObject({ exitCode: 2 });
    expect(normalizeCliError(new CliOperationFailedError('failed'))).toMatchObject({ exitCode: 30 });
    expect(normalizeCliError(new SagaResourceConflictError(['x']))).toMatchObject({ exitCode: 4 });
  });

  it('maps a wait timeout to exit code 31', () => {
    expect(EXIT_CODES.WAIT_TIMEOUT).toBe(31);
    expect(normalizeCliError(new CliWaitTimeoutError('Wait timed out; last status Executing.'))).toMatchObject({
      exitCode: 31,
      message: 'Wait timed out; last status Executing.',
    });
  });

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

  it('lists each backend validation problem on its own line in text output', () => {
    const payload = normalizeCliError(
      createApiError(400, {
        error: 'Scheduled plan is invalid.',
        errors: [
          { field: 'agentPool', message: 'A HagiTask plan needs an agent pool with one agent.' },
          { field: 'schedule.timeOfDay', message: 'Use HH:mm.' },
          { field: 'name', message: 'Name is required.' },
        ],
      }),
    );

    expect(renderCliError(payload)).toBe(
      'Scheduled plan is invalid. (status=400)\n' +
        '  - agentPool: A HagiTask plan needs an agent pool with one agent.\n' +
        '  - schedule.timeOfDay: Use HH:mm.\n' +
        '  - name: Name is required.\n',
    );
  });

  it('keeps the message alone when the errors value is malformed', () => {
    const payload = normalizeCliError(
      createApiError(400, { error: 'Scheduled plan is invalid.', errors: 'agentPool is wrong' }),
    );

    expect(renderCliError(payload)).toBe('Scheduled plan is invalid. (status=400)\n');
  });

  it('skips validation entries without string field and message', () => {
    const payload = normalizeCliError(
      createApiError(400, {
        error: 'Scheduled plan is invalid.',
        errors: [{ field: 'name' }, 'bad entry', { field: 'enabled', message: 'Must be a boolean.' }],
      }),
    );

    expect(renderCliError(payload)).toBe(
      'Scheduled plan is invalid. (status=400)\n  - enabled: Must be a boolean.\n',
    );
  });

  it('renders bodies without an errors array exactly as before', () => {
    const payload = normalizeCliError(createApiError(404, { error: 'Plan not found.' }));

    expect(renderCliError(payload)).toBe('Plan not found. (status=404)\n');
  });

  it('keeps the full validation body under details in json output', () => {
    const payload = normalizeCliError(
      createApiError(400, {
        error: 'Scheduled plan is invalid.',
        errors: [{ field: 'agentPool', message: 'Needs one agent.' }],
      }),
    );

    const json = renderCliError(payload, { json: true });
    expect(json).not.toContain('  - agentPool');
    expect(JSON.parse(json).error.details).toEqual({
      error: 'Scheduled plan is invalid.',
      errors: [{ field: 'agentPool', message: 'Needs one agent.' }],
    });
  });

  it('treats usage errors separately from backend failures', () => {
    expect(normalizeCliError(new CliUsageError('Missing required input'))).toEqual({
      exitCode: EXIT_CODES.USAGE,
      message: 'Missing required input',
    });
  });

  it('maps a refused operation to exit code 30 with the backend message', () => {
    expect(EXIT_CODES.OPERATION_FAILED).toBe(30);
    expect(normalizeCliError(new CliOperationFailedError('Unknown built-in skill: nope.'))).toEqual({
      exitCode: 30,
      message: 'Unknown built-in skill: nope.',
    });
  });

  it('maps Saga resource conflicts to exit code 4', () => {
    expect(normalizeCliError(new SagaResourceConflictError(['prompts/goal.md']))).toEqual({
      exitCode: 4,
      message: 'Saga resources conflict with existing files: prompts/goal.md. Re-run with --force to replace them.',
    });
  });

  describe('gRPC failures', () => {
    it.each([
      [Code.InvalidArgument, 400, EXIT_CODES.HTTP_BAD_REQUEST],
      [Code.Unauthenticated, 401, EXIT_CODES.HTTP_UNAUTHORIZED],
      [Code.PermissionDenied, 403, EXIT_CODES.HTTP_FORBIDDEN],
      [Code.NotFound, 404, EXIT_CODES.HTTP_NOT_FOUND],
      [Code.FailedPrecondition, 409, EXIT_CODES.HTTP_CONFLICT],
      [Code.AlreadyExists, 409, EXIT_CODES.HTTP_CONFLICT],
      [Code.ResourceExhausted, 429, EXIT_CODES.HTTP_CLIENT_ERROR],
      [Code.Internal, 500, EXIT_CODES.HTTP_SERVER_ERROR],
      [Code.Unavailable, 503, EXIT_CODES.HTTP_SERVER_ERROR],
      [Code.DeadlineExceeded, 504, EXIT_CODES.HTTP_SERVER_ERROR],
    ])('maps %s to status %i and exit code %i', (code, status, exitCode) => {
      expect(normalizeCliError(new ConnectError('Backend said no', code))).toMatchObject({
        exitCode,
        status,
        message: 'Backend said no',
      });
    });

    it('reports a message that is too large as 413', () => {
      expect(
        normalizeCliError(new ConnectError('Request message exceeds the maximum size.', Code.ResourceExhausted)),
      ).toMatchObject({ status: 413, exitCode: EXIT_CODES.HTTP_CLIENT_ERROR });
    });

    it('treats a failure with an underlying socket error as a transport failure', () => {
      const error = new ConnectError('connect ECONNREFUSED 127.0.0.1:1', Code.Unavailable, undefined, undefined, new Error('boom'));

      expect(normalizeCliError(error, { baseUrl: 'http://127.0.0.1:1' })).toEqual({
        exitCode: EXIT_CODES.TRANSPORT,
        message: 'Cannot reach HagiCode backend at http://127.0.0.1:1. Check that the backend is running and the base URL is correct.',
      });
    });

    it('keeps an Unavailable status the backend sent on purpose as an HTTP-style failure', () => {
      expect(normalizeCliError(new ConnectError('A dependency is unavailable.', Code.Unavailable))).toMatchObject({
        exitCode: EXIT_CODES.HTTP_SERVER_ERROR,
        status: 503,
      });
    });

    it('reports an unusable base URL by name', () => {
      const error = new ConnectError('Invalid URL', Code.Unknown, undefined, undefined, new TypeError('Invalid URL'));

      expect(normalizeCliError(error, { baseUrl: 'not a url' })).toEqual({
        exitCode: EXIT_CODES.TRANSPORT,
        message: 'Invalid HagiCode backend base URL: not a url',
      });
    });

    it('surfaces the business code from the error detail as errorCode', () => {
      const error = new ConnectError('Project is locked.', Code.FailedPrecondition, undefined, [
        { desc: ErrorDetailSchema, value: { code: 'PCode.Project.Locked' } },
      ]);

      expect(normalizeCliError(error)).toMatchObject({
        status: 409,
        errorCode: 'PCode.Project.Locked',
        details: { error: 'Project is locked.', code: 'PCode.Project.Locked' },
      });
    });

    it('lists MonoSpecs field errors under the message', () => {
      const payload = normalizeCliError(
        createApiError(400, {
          error: 'MonoSpecs configuration is invalid.',
          fieldErrors: [{ field: 'repositories[0].path', message: 'Path is required.' }],
        }),
      );

      expect(payload.message).toBe('MonoSpecs configuration is invalid.\n  - repositories[0].path: Path is required.');
    });

    it('describes a cancelled call without a status', () => {
      expect(normalizeCliError(new ConnectError('aborted', Code.Canceled))).toEqual({
        exitCode: EXIT_CODES.UNKNOWN,
        message: 'The request was cancelled.',
      });
    });
  });

  describe('lock exit codes', () => {
    it('gives a lost lock exit code 32, distinct from 31 and from every other code', () => {
      expect(EXIT_CODES.LOCK_LOST).toBe(32);
      expect(EXIT_CODES.LOCK_LOST).not.toBe(EXIT_CODES.WAIT_TIMEOUT);

      const codes = Object.values(EXIT_CODES);
      expect(codes.filter(code => code === EXIT_CODES.LOCK_LOST)).toHaveLength(1);
      expect(new Set(codes).size).toBe(codes.length);
    });

    it('normalizes a lock-lost error to exit code 32 and keeps its business code', () => {
      expect(normalizeCliError(new CliLockLostError('gone', { errorCode: 'PCode.Lock.NotHolder' }))).toEqual({
        exitCode: 32,
        message: 'gone',
        errorCode: 'PCode.Lock.NotHolder',
      });
    });

    it('reads FailedPrecondition as a lost lock for lock commands only', () => {
      const failed = new ConnectError('Not the holder.', Code.FailedPrecondition, undefined, [
        { desc: ErrorDetailSchema, value: { code: 'PCode.Lock.NotHolder' } },
      ]);
      const lost = toLockLostError(failed);

      expect(lost).toBeInstanceOf(CliLockLostError);
      expect(lost).toMatchObject({ message: 'Not the holder.', errorCode: 'PCode.Lock.NotHolder' });
      expect(normalizeCliError(lost)).toMatchObject({ exitCode: EXIT_CODES.LOCK_LOST });
      // Other commands keep the generic mapping of the same failure.
      expect(normalizeCliError(failed)).toMatchObject({ exitCode: EXIT_CODES.HTTP_CONFLICT });
      expect(toLockLostError(new ConnectError('bad', Code.InvalidArgument))).toBeUndefined();
      expect(toLockLostError(new Error('boom'))).toBeUndefined();
    });

    it('treats Unavailable and a failed connection as transient, and a backend refusal as not', () => {
      expect(isTransientLockFailure(new ConnectError('down', Code.Unavailable))).toBe(true);
      expect(isTransientLockFailure(new ConnectError('slow', Code.DeadlineExceeded))).toBe(true);
      expect(isTransientLockFailure(new ConnectError('refused', Code.Unknown, undefined, undefined, new Error('fetch failed')))).toBe(true);
      expect(isTransientLockFailure(new Error('fetch failed'))).toBe(true);
      expect(isTransientLockFailure(new ConnectError('no', Code.FailedPrecondition))).toBe(false);
      expect(isTransientLockFailure(new ConnectError('bad', Code.InvalidArgument))).toBe(false);
      expect(isTransientLockFailure(new ConnectError('cancelled', Code.Canceled))).toBe(false);
    });
  });
});

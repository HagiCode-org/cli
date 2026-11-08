import { Code, ConnectError } from '@connectrpc/connect';
import { ErrorDetailSchema } from '../generated/grpc/hagicode/common/v1/error_detail_pb';

export const EXIT_CODES = {
  USAGE: 2,
  HTTP_BAD_REQUEST: 20,
  HTTP_UNAUTHORIZED: 21,
  HTTP_FORBIDDEN: 23,
  HTTP_NOT_FOUND: 24,
  HTTP_CONFLICT: 29,
  OPERATION_FAILED: 30,
  /** A `--wait` ran out of time before the session status settled. */
  WAIT_TIMEOUT: 31,
  /** A resource lock command learned that the owner no longer holds the lock (expired, taken back, stale epoch, requisitioned). */
  LOCK_LOST: 32,
  HTTP_CLIENT_ERROR: 40,
  HTTP_SERVER_ERROR: 50,
  TRANSPORT: 60,
  UNKNOWN: 70,
} as const;

export type CliErrorPayload = {
  exitCode: number;
  message: string;
  status?: number;
  errorCode?: string;
  correlationId?: string;
  details?: unknown;
};

export class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

/**
 * The backend answered with a result that says the operation did not happen, although the HTTP call succeeded.
 * The message is the backend's user-facing message.
 */
export class CliOperationFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliOperationFailedError';
  }
}

/**
 * A `--wait` read ended at the timeout while the session was still running. Exit code 31 tells a script that the
 * session did not settle; it is not a success and not an HTTP failure.
 */
export class CliWaitTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliWaitTimeoutError';
  }
}

/**
 * A lock command learned that the owner does not (or no longer) hold the lock. Exit code 32 tells a script or a watcher to
 * stop using the resource. `reported` is set when the command already printed the reason itself, so it is not printed twice.
 */
export class CliLockLostError extends Error {
  errorCode?: string;
  reported: boolean;

  constructor(message: string, options: { errorCode?: string; reported?: boolean } = {}) {
    super(message);
    this.name = 'CliLockLostError';
    this.errorCode = options.errorCode;
    this.reported = options.reported ?? false;
  }
}

export class CliHttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'CliHttpError';
    this.status = status;
    this.details = details;
  }
}

function asErrorObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function readStringProperty(source: unknown, key: string): string | undefined {
  const record = asErrorObject(source);
  const value = record?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function inferTransportError(message: string): boolean {
  return (
    message.includes('fetch failed') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT') ||
    message.includes('EHOSTUNREACH') ||
    message.includes('EAI_AGAIN') ||
    message.includes('Failed to parse URL') ||
    message.includes('Invalid URL')
  );
}

export function mapExitCodeFromStatus(status?: number): number {
  switch (status) {
    case 400:
      return EXIT_CODES.HTTP_BAD_REQUEST;
    case 401:
      return EXIT_CODES.HTTP_UNAUTHORIZED;
    case 403:
      return EXIT_CODES.HTTP_FORBIDDEN;
    case 404:
      return EXIT_CODES.HTTP_NOT_FOUND;
    case 409:
      return EXIT_CODES.HTTP_CONFLICT;
    default:
      if (status && status >= 400 && status < 500) {
        return EXIT_CODES.HTTP_CLIENT_ERROR;
      }

      if (status && status >= 500) {
        return EXIT_CODES.HTTP_SERVER_ERROR;
      }

      return EXIT_CODES.UNKNOWN;
  }
}

/**
 * HTTP-equivalent status of a gRPC code. The CLI exit codes and the `status=` text stay what they were on REST, so scripts
 * that branch on them keep working. The table matches the one the web client uses.
 */
const STATUS_BY_CODE: Partial<Record<Code, number>> = {
  [Code.InvalidArgument]: 400,
  [Code.OutOfRange]: 400,
  [Code.Unauthenticated]: 401,
  [Code.PermissionDenied]: 403,
  [Code.NotFound]: 404,
  [Code.AlreadyExists]: 409,
  [Code.FailedPrecondition]: 409,
  [Code.Aborted]: 409,
  [Code.Unimplemented]: 501,
  [Code.Internal]: 500,
  [Code.Unknown]: 500,
  [Code.DataLoss]: 500,
  [Code.Unavailable]: 503,
  [Code.DeadlineExceeded]: 504,
};

// ResourceExhausted is 429 unless the server says a message was too large, which REST reported as 413.
const TOO_LARGE_PATTERN = /exceeds?\s+the\s+maximum|too\s+large|payload\s+too\s+large/i;

export function mapStatusFromGrpcCode(error: ConnectError): number {
  if (error.code === Code.ResourceExhausted) {
    return TOO_LARGE_PATTERN.test(error.rawMessage) ? 413 : 429;
  }

  return STATUS_BY_CODE[error.code] ?? 500;
}

/**
 * True when the call never got an answer from a gRPC server: the socket failed or the URL is unusable. A status the server
 * sent on purpose (a business `Unavailable`, for example) has no underlying cause and is not a transport failure.
 */
function isTransportFailure(error: ConnectError): boolean {
  if (error.code !== Code.Unavailable && error.code !== Code.Unknown && error.code !== Code.Internal && error.code !== Code.Aborted) {
    return false;
  }

  return error.cause instanceof Error || inferTransportError(error.rawMessage);
}

/** A backend failure read from a `ConnectError`, in the shape the REST error body had. */
export type BackendFailure = {
  status: number;
  message: string;
  /** Stable business code the server attached to the failure, when it sent one. */
  code?: string;
  /** `{ error, code?, ...values }`: the message plus the structured values of the failure (validation errors, diagnostics). */
  body: Record<string, unknown>;
};

/**
 * Reads a gRPC status failure as the old REST error body: the message under `error`, the business code under `code` and the
 * structured values the server packed into the status details beside them. Returns undefined for anything that is not an
 * answer from the backend (another error type, a cancelled call, a failed connection).
 */
export function readBackendFailure(error: unknown): BackendFailure | undefined {
  if (!(error instanceof ConnectError) || error.code === Code.Canceled || isTransportFailure(error)) {
    return undefined;
  }

  const [detail] = error.findDetails(ErrorDetailSchema);
  const code = detail && detail.code.length > 0 ? detail.code : undefined;
  const data = (detail?.data ?? {}) as Record<string, unknown>;
  const message = error.rawMessage.trim() || `The backend rejected the request (${Code[error.code]}).`;

  return {
    status: mapStatusFromGrpcCode(error),
    message,
    code,
    body: { error: message, ...(code ? { code } : {}), ...data },
  };
}

/**
 * Lock commands read a backend `FailedPrecondition` (not the holder, expired, stale epoch, requisitioned) as a lost lock.
 * Returns the error to throw instead, or undefined when the failure is of another kind.
 */
export function toLockLostError(error: unknown): CliLockLostError | undefined {
  if (!(error instanceof ConnectError) || error.code !== Code.FailedPrecondition) {
    return undefined;
  }

  const failure = readBackendFailure(error);
  return new CliLockLostError(failure?.message ?? error.rawMessage, { errorCode: failure?.code });
}

/**
 * True for a failure that proves nothing about the lock: the backend could not be reached or did not answer in time.
 * Lock waits and heartbeats retry these; only a backend answer can show a lost lock.
 */
export function isTransientLockFailure(error: unknown): boolean {
  if (error instanceof ConnectError) {
    return (
      error.code === Code.Unavailable ||
      error.code === Code.DeadlineExceeded ||
      (error.code !== Code.Canceled && readBackendFailure(error) === undefined)
    );
  }

  return error instanceof Error && inferTransportError(error.message);
}

export type CliErrorContext = {
  /** Base URL the failed invocation resolved to, named in connection failures. */
  baseUrl?: string;
};

function normalizeTransportError(message: string, context: CliErrorContext): CliErrorPayload {
  const target = context.baseUrl ?? 'the configured backend';
  return {
    exitCode: EXIT_CODES.TRANSPORT,
    message: /Failed to parse URL|Invalid URL/i.test(message)
      ? `Invalid HagiCode backend base URL: ${target}`
      : `Cannot reach HagiCode backend at ${target}. Check that the backend is running and the base URL is correct.`,
  };
}

export function normalizeCliError(error: unknown, context: CliErrorContext = {}): CliErrorPayload {
  if (error instanceof CliUsageError) {
    return {
      exitCode: EXIT_CODES.USAGE,
      message: error.message,
    };
  }

  if (error instanceof CliOperationFailedError) {
    return {
      exitCode: EXIT_CODES.OPERATION_FAILED,
      message: error.message,
    };
  }

  if (error instanceof CliWaitTimeoutError) {
    return {
      exitCode: EXIT_CODES.WAIT_TIMEOUT,
      message: error.message,
    };
  }

  if (error instanceof CliLockLostError) {
    return {
      exitCode: EXIT_CODES.LOCK_LOST,
      message: error.message,
      errorCode: error.errorCode,
    };
  }

  if (error instanceof CliHttpError) {
    return {
      exitCode: mapExitCodeFromStatus(error.status),
      status: error.status,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof ConnectError) {
    const failure = readBackendFailure(error);
    if (failure) {
      const fieldLines = readFieldErrorLines(failure.body);

      return {
        exitCode: mapExitCodeFromStatus(failure.status),
        status: failure.status,
        message: fieldLines.length > 0 ? [failure.message, ...fieldLines].join('\n') : failure.message,
        errorCode: readStringProperty(failure.body, 'errorCode') ?? failure.code,
        correlationId: readStringProperty(failure.body, 'correlationId'),
        details: failure.body,
      };
    }

    if (error.code === Code.Canceled) {
      return { exitCode: EXIT_CODES.UNKNOWN, message: 'The request was cancelled.' };
    }

    return normalizeTransportError(error.rawMessage, context);
  }

  if (error instanceof Error) {
    if (!inferTransportError(error.message)) {
      return {
        exitCode: EXIT_CODES.UNKNOWN,
        message: error.message,
      };
    }

    return normalizeTransportError(error.message, context);
  }

  return {
    exitCode: EXIT_CODES.UNKNOWN,
    message: String(error),
  };
}

/**
 * Field-level problems from a backend validation body (`details.errors[]` with string `field` and `message`).
 * Entries of any other shape are skipped, and a body without a usable `errors` array yields no lines.
 */
function readValidationLines(details: unknown): string[] {
  const errors = asErrorObject(details)?.errors;
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.flatMap(entry => {
    const field = readStringProperty(entry, 'field');
    const message = readStringProperty(entry, 'message');
    return field && message ? [`  - ${field}: ${message}`] : [];
  });
}

/**
 * MonoSpecs field errors (`fieldErrors[]` with string `field` and `message`) appended to the error message.
 * The body itself stays in `details`, so JSON output keeps the full backend payload.
 */
function readFieldErrorLines(details: unknown): string[] {
  const fieldErrors = asErrorObject(details)?.fieldErrors;
  if (!Array.isArray(fieldErrors)) {
    return [];
  }

  return fieldErrors.flatMap(entry => {
    const field = readStringProperty(entry, 'field');
    const message = readStringProperty(entry, 'message');
    return field && message ? [`  - ${field}: ${message}`] : [];
  });
}

export function renderCliError(
  payload: CliErrorPayload,
  options: { json?: boolean } = {},
): string {
  if (options.json) {
    return `${JSON.stringify(
      {
        error: {
          message: payload.message,
          status: payload.status,
          exitCode: payload.exitCode,
          errorCode: payload.errorCode,
          correlationId: payload.correlationId,
          details: payload.details,
        },
      },
      null,
      2,
    )}\n`;
  }

  const metadata = [
    payload.status ? `status=${payload.status}` : undefined,
    payload.errorCode ? `errorCode=${payload.errorCode}` : undefined,
    payload.correlationId ? `correlationId=${payload.correlationId}` : undefined,
  ].filter(Boolean);

  const suffix = metadata.length > 0 ? ` (${metadata.join(', ')})` : '';
  return [`${payload.message}${suffix}`, ...readValidationLines(payload.details)].join('\n') + '\n';
}

import { ApiError } from '../generated/api/core/ApiError';

export const EXIT_CODES = {
  USAGE: 2,
  HTTP_BAD_REQUEST: 20,
  HTTP_UNAUTHORIZED: 21,
  HTTP_FORBIDDEN: 23,
  HTTP_NOT_FOUND: 24,
  HTTP_CONFLICT: 29,
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
    message.includes('Failed to parse URL')
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

export function normalizeCliError(error: unknown): CliErrorPayload {
  if (error instanceof CliUsageError) {
    return {
      exitCode: EXIT_CODES.USAGE,
      message: error.message,
    };
  }

  if (error instanceof ApiError) {
    const backendMessage =
      readStringProperty(error.body, 'error') ??
      readStringProperty(error.body, 'message') ??
      error.message;

    return {
      exitCode: mapExitCodeFromStatus(error.status),
      status: error.status,
      message: backendMessage,
      errorCode: readStringProperty(error.body, 'errorCode'),
      correlationId: readStringProperty(error.body, 'correlationId'),
      details: error.body,
    };
  }

  if (error instanceof Error) {
    return {
      exitCode: inferTransportError(error.message) ? EXIT_CODES.TRANSPORT : EXIT_CODES.UNKNOWN,
      message: error.message,
    };
  }

  return {
    exitCode: EXIT_CODES.UNKNOWN,
    message: String(error),
  };
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
  return `${payload.message}${suffix}\n`;
}

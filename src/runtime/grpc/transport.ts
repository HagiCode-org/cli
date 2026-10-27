import type { Interceptor, Transport } from '@connectrpc/connect';
import { createGrpcWebTransport } from '@connectrpc/connect-node';
import { getActiveRuntime } from '../apiRuntime';
import { CLI_CLIENT_MARKER } from '../version';

/** The path prefix under which the backend maps its gRPC services. */
export const GRPC_PATH_PREFIX = '/grpc';

/** Joins the configured backend base URL and the gRPC prefix, tolerating trailing slashes on the base URL. */
export function resolveGrpcBaseUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}${GRPC_PATH_PREFIX}`;
}

/**
 * Adds the headers every backend call carries: the client marker, the bearer token when the caller passed one and the
 * language. The settings are read per call, so a changed token or language applies without a new transport.
 */
export const headerInterceptor: Interceptor = next => async request => {
  const { token, lang } = getActiveRuntime();
  request.header.set('X-Hagi-Client', CLI_CLIENT_MARKER);
  if (token) {
    request.header.set('Authorization', `Bearer ${token}`);
  }
  if (lang) {
    request.header.set('Accept-Language', lang);
  }

  return next(request);
};

let cached: { baseUrl: string; transport: Transport } | undefined;

/**
 * The one gRPC-Web transport for the active base URL. gRPC-Web runs over HTTP/1.1, so it works against the plain-HTTP
 * backend and through reverse proxies; the backend enables it for every mapped service.
 */
export function getGrpcTransport(): Transport {
  const baseUrl = resolveGrpcBaseUrl(getActiveRuntime().baseUrl);
  if (!cached || cached.baseUrl !== baseUrl) {
    cached = {
      baseUrl,
      transport: createGrpcWebTransport({
        baseUrl,
        httpVersion: '1.1',
        useBinaryFormat: true,
        interceptors: [headerInterceptor],
      }),
    };
  }

  return cached.transport;
}

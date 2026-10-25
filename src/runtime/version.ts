// Replaced at build time by the define in vite.config.ts (and vitest.config.ts) with the package.json version.
declare const __HAGI_CLI_VERSION__: string | undefined;

/** Builds the self-reported client marker, `cli/<version>`, or `cli/unknown` when no version is known. */
export function formatCliClientMarker(version: string | undefined): string {
  return `cli/${version ?? 'unknown'}`;
}

/** Value of the `X-Hagi-Client` header sent on every backend request. It is not a credential. */
export const CLI_CLIENT_MARKER = formatCliClientMarker(
  typeof __HAGI_CLI_VERSION__ === 'undefined' ? undefined : __HAGI_CLI_VERSION__,
);

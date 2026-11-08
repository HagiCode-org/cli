import type { TokenMonitorUsageSnapshot } from '../runtime/hagiApi';
import type { LimitReading, QuotaState, QuotaWait } from '../runtime/usageLimits';

/** One window in the output. Key order is fixed here so the JSON is deterministic. */
export type UsageWindowPayload = {
  provider: string;
  kind: string;
  remainingPercent: number | null;
  resetsAtUtc: string | null;
  minutesToReset: number | null;
  windowMinutes: number | null;
  watched: boolean;
};

/**
 * `state` is `ready` or `low` after a wait, `unknown` whenever no usable figure was read, and `null` for a plain read
 * with figures (no threshold was given, so there is nothing to call ready or low).
 */
export type UsageLimitsPayload = {
  state: QuotaState | null;
  reason: string | null;
  provider: string | null;
  status: string;
  source: string;
  failureReason: string | null;
  dateKey: string | null;
  totalTokens: string | number | null;
  costUsd: number | null;
  windows: UsageWindowPayload[];
  guard: QuotaWait | null;
};

export function formatUsageLimitsPayload(
  snapshot: TokenMonitorUsageSnapshot | null,
  windows: LimitReading[],
  options: { provider: string | undefined; reason: string | null; guard: QuotaWait | null },
): UsageLimitsPayload {
  const guard = options.guard;
  const state = guard ? guard.state : options.reason === null ? null : 'unknown';

  return {
    state,
    reason: guard ? guard.reason : options.reason,
    provider: options.provider ?? null,
    status: snapshot?.status ?? 'unavailable',
    source: snapshot?.source ?? 'none',
    failureReason: snapshot?.failureReason ?? null,
    dateKey: snapshot?.dateKey ?? null,
    totalTokens: snapshot?.totalTokens ?? null,
    costUsd: snapshot?.costUsd ?? null,
    windows: windows.map(window => ({
      provider: window.provider,
      kind: window.kind,
      remainingPercent: window.remainingPercent,
      resetsAtUtc: window.resetsAtUtc,
      minutesToReset: window.minutesToReset,
      windowMinutes: window.windowMinutes,
      watched: window.watched,
    })),
    guard,
  };
}

/** Human text. A wait starts with READY, LOW or UNAVAILABLE; a plain read starts with READ or UNAVAILABLE. */
export function formatUsageLimitsHuman(payload: UsageLimitsPayload): string {
  const scope = payload.provider ?? 'all providers';
  const lines: string[] = [];

  lines.push(headline(payload, scope));

  for (const window of payload.windows) {
    lines.push(`  ${windowLine(window)}`);
  }

  if (payload.windows.length === 0 && payload.state !== 'unknown') {
    lines.push('  No limit windows reported.');
  }

  return `${lines.join('\n')}\n`;
}

function headline(payload: UsageLimitsPayload, scope: string): string {
  const guard = payload.guard;

  if (guard?.state === 'ready') {
    return `READY ${scope}: every watched window is above ${guard.thresholdPercent}% remaining (waited ${guard.waitedSeconds}s, stagger ${guard.jitterSeconds}s).`;
  }

  if (guard?.state === 'low') {
    const blockers = guard.blockers.map(windowSummary).join('; ');
    return `LOW ${scope}: at or below ${guard.thresholdPercent}% after waiting ${guard.waitedSeconds}s: ${blockers}.`;
  }

  if (payload.state === 'unknown') {
    return `UNAVAILABLE ${scope}: ${payload.reason ?? 'no usable figure'}.`;
  }

  return `READ ${scope}: ${payload.windows.length} limit window(s), no threshold given.`;
}

function windowSummary(window: UsageWindowPayload): string {
  const remaining = window.remainingPercent === null ? 'remaining unknown' : `${window.remainingPercent}% remaining`;
  return `${window.provider} ${window.kind} ${remaining}, resets ${window.resetsAtUtc ?? 'at an unknown time'}`;
}

function windowLine(window: UsageWindowPayload): string {
  const length = window.windowMinutes === null ? '' : ` [${window.windowMinutes} min]`;
  const remaining = window.remainingPercent === null ? 'remaining unknown' : `remaining ${window.remainingPercent}%`;
  const reset = window.resetsAtUtc === null
    ? 'reset unknown'
    : `resets ${window.resetsAtUtc} (in ${window.minutesToReset ?? '?'} min)`;
  const watched = window.watched ? '' : ' (not watched: weekly or longer)';
  return `${window.provider} ${window.kind}${length}: ${remaining}, ${reset}${watched}`;
}

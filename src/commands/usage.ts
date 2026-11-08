import type { Command } from 'commander';
import { formatJson } from '../formatters/json';
import { formatUsageLimitsHuman, formatUsageLimitsPayload, type UsageLimitsPayload } from '../formatters/usage';
import {
  addJsonOption,
  createCommandContext,
  sleepForMilliseconds,
  type AppDependencies,
} from '../runtime/commandContext';
import { CliQuotaUnknownError, CliUsageError, EXIT_CODES } from '../runtime/errors';
import {
  DEFAULT_JITTER_SECONDS,
  DEFAULT_MAX_WAIT_SECONDS,
  MAX_JITTER_LIMIT_SECONDS,
  MAX_WAIT_LIMIT_SECONDS,
  readLimitWindows,
  unusableReason,
  waitForQuota,
  type QuotaClock,
} from '../runtime/usageLimits';

export function registerUsageCommands(program: Command, dependencies: AppDependencies): void {
  const usage = program
    .command('usage')
    .description('Read Token Monitor usage: each provider\'s limit windows with their remaining percent and reset times.');

  addJsonOption(
    usage
      .command('limits')
      .description('Read provider limit windows. With --wait-until-above, wait for a reset for a bounded time. Read-only.')
      .option('--provider <id>', 'Only this provider, for example claude or codex. Required with --wait-until-above.')
      .option('--wait-until-above <percent>', 'Wait until every short window (six hours or less) of --provider is above this remaining percent.')
      .option('--max-wait <seconds>', `Longest wait with --wait-until-above (default ${DEFAULT_MAX_WAIT_SECONDS}; 0 checks once; at most ${MAX_WAIT_LIMIT_SECONDS}).`)
      .option('--jitter-seconds <seconds>', `Random delay after a wait that ends ready (default ${DEFAULT_JITTER_SECONDS}; 0 disables; at most ${MAX_JITTER_LIMIT_SECONDS}).`)
      .addHelpText(
        'after',
        `
Exit codes: 0 a usable reading (with --wait-until-above: ready or low; low is not a failure),
${EXIT_CODES.QUOTA_UNKNOWN} unavailable (no usable figure was read), 2 invalid options.
Transport and HTTP failures keep their usual codes. Quota comes only from the backend Token Monitor usage RPC.
`,
      ),
  ).action(async function usageLimitsAction(this: Command) {
    const options = this.opts<{ provider?: string; waitUntilAbove?: string; maxWait?: string; jitterSeconds?: string }>();
    const provider = options.provider?.trim() || undefined;
    const threshold = parseWholeNumber(options.waitUntilAbove, '--wait-until-above', 0, 100);
    const maxWait = parseWholeNumber(options.maxWait, '--max-wait', 0, MAX_WAIT_LIMIT_SECONDS);
    const jitter = parseWholeNumber(options.jitterSeconds, '--jitter-seconds', 0, MAX_JITTER_LIMIT_SECONDS);

    // Every option check runs before the context is built and before any backend call.
    if (threshold === undefined) {
      if (options.maxWait !== undefined || options.jitterSeconds !== undefined) {
        throw new CliUsageError('--max-wait and --jitter-seconds apply only with --wait-until-above <percent>.');
      }
    } else if (provider === undefined) {
      throw new CliUsageError('--wait-until-above needs --provider <id>: a wait watches one provider\'s windows.');
    }

    const context = createCommandContext(this, dependencies);
    const clock: QuotaClock = {
      now: dependencies.now ?? Date.now,
      sleep: dependencies.sleep ?? sleepForMilliseconds,
      random: Math.random,
    };
    const readSnapshot = () => context.api.getTokenMonitorUsage();
    const emit = (payload: UsageLimitsPayload) => {
      context.io.stdout(context.outputJson ? formatJson(payload) : formatUsageLimitsHuman(payload));
    };

    if (threshold === undefined) {
      const snapshot = await readSnapshot();
      const windows = readLimitWindows(snapshot, clock.now(), provider);
      const reason = unusableReason(snapshot, windows, provider, false);

      emit(formatUsageLimitsPayload(snapshot, windows, { provider, reason, guard: null }));
      if (reason !== null) {
        throw new CliQuotaUnknownError(`Quota unavailable: ${reason}.`);
      }
      return;
    }

    const outcome = await waitForQuota(readSnapshot, {
      provider: provider as string,
      thresholdPercent: threshold,
      maxWaitSeconds: maxWait ?? DEFAULT_MAX_WAIT_SECONDS,
      jitterSeconds: jitter ?? DEFAULT_JITTER_SECONDS,
    }, clock);

    emit(formatUsageLimitsPayload(outcome.snapshot, outcome.windows, { provider, reason: null, guard: outcome.wait }));
    if (outcome.wait.state === 'unknown') {
      throw new CliQuotaUnknownError(`${provider} quota could not be read: ${outcome.wait.reason ?? 'no usable figure'}.`);
    }
  });
}

function parseWholeNumber(value: string | undefined, flag: string, min: number, max: number): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new CliUsageError(`${flag} must be a whole number.`);
  }

  const parsed = Number(value.trim());
  if (parsed < min || parsed > max) {
    throw new CliUsageError(`${flag} must be between ${min} and ${max}.`);
  }

  return parsed;
}

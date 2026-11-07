import { Option } from 'commander';
import { Code, ConnectError } from '@connectrpc/connect';
import type { SteerView } from '../formatters/session';
import type { PCode_Models_AIProviderType } from '../generated/api/models/PCode_Models_AIProviderType';
import type { PCode_Models_MessageMode } from '../generated/api/models/PCode_Models_MessageMode';
import { normalizeRuntimeValue, readConfigFileSteer } from './apiRuntime';
import { CliUsageError } from './errors';
import type { HagiApi } from './hagiApi';

/** Reason recorded when an implicit Steer meets a backend that does not implement `SteerSession`. */
export const STEER_UNSUPPORTED_REASON = 'the backend does not support Steer';

/** Environment variable that turns Steer on or off for every send in this environment. */
export const STEER_ENV_VAR = 'HAGI_SEND_STEER';

/** `--steer`: requests Steer for this send. Register it before `--no-steer` so an unset flag stays `undefined`. */
export function steerOption(): Option {
  return new Option('--steer', 'Deliver the message to the running task as a Steer. Overrides HAGI_SEND_STEER and the config file.');
}

/** `--no-steer`: sends a normal message, even when HAGI_SEND_STEER or the config file asks for Steer. */
export function noSteerOption(): Option {
  return new Option('--no-steer', 'Send a normal message, even when HAGI_SEND_STEER or the config file asks for Steer.');
}

export type SteerSource = 'flag' | 'env' | 'config' | 'default';

export type SteerSetting = {
  requested: boolean;
  source: SteerSource;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);
const FALSE_VALUES = new Set(['0', 'false', 'no', 'off']);

/** Reads `HAGI_SEND_STEER`. A blank value counts as not set. Any other unrecognized value is a usage error. */
function readEnvSteer(env: NodeJS.ProcessEnv): boolean | undefined {
  const raw = normalizeRuntimeValue(env[STEER_ENV_VAR]);
  if (raw === undefined) {
    return undefined;
  }

  const value = raw.toLowerCase();
  if (TRUE_VALUES.has(value)) {
    return true;
  }

  if (FALSE_VALUES.has(value)) {
    return false;
  }

  throw new CliUsageError(
    `${STEER_ENV_VAR} has an unrecognized value "${raw}". Accepted values: 1, true, yes, on (Steer) or 0, false, no, off (no Steer).`,
  );
}

/**
 * Resolves whether a send asks for Steer. The first source that is set decides: the command-line flag (`--steer` true,
 * `--no-steer` false), then `HAGI_SEND_STEER`, then the `steer` key of the config file, then `false`. A lower-priority
 * source is not read or validated once a higher one is set.
 */
export function resolveSteerSetting({ flag, env }: { flag?: boolean; env: NodeJS.ProcessEnv }): SteerSetting {
  if (flag !== undefined) {
    return { requested: flag, source: 'flag' };
  }

  const fromEnv = readEnvSteer(env);
  if (fromEnv !== undefined) {
    return { requested: fromEnv, source: 'env' };
  }

  const fromConfig = readConfigFileSteer(env);
  if (fromConfig !== undefined) {
    return { requested: fromConfig, source: 'config' };
  }

  return { requested: false, source: 'default' };
}

export type SendSessionMessageInput = {
  context: { api: HagiApi; env: NodeJS.ProcessEnv };
  sessionId: string;
  content: string;
  mode?: PCode_Models_MessageMode;
  executorType?: PCode_Models_AIProviderType;
  /** The `--steer` (true) or `--no-steer` (false) option, or undefined when neither was passed. */
  steerFlag?: boolean;
};

export type SendSessionMessageResult = {
  /** The `message` of the output: the backend's text for a normal send, `Steered` or `Queued` for a Steer. */
  message: string;
  steer: SteerView;
};

/**
 * The one send path of `chat send`, `proposal send`, and `hagitask send`. Decides before any call whether the message goes
 * as a Steer or as a normal send:
 * - Steer not requested: a normal send, as before.
 * - Steer requested with `--mode` or `--executor-type`: an explicit flag is a usage error (no call); an implicit setting
 *   falls back to a normal send with the reason.
 * - Otherwise one `SteerSession` call. Any outcome other than `steered` is reported as `queued`. An implicit Steer that the
 *   backend does not implement (`Unimplemented`) falls back to a normal send. An explicit Steer rethrows every error.
 */
export async function sendSessionMessage(input: SendSessionMessageInput): Promise<SendSessionMessageResult> {
  const { context, sessionId, content, mode, executorType, steerFlag } = input;
  const setting = resolveSteerSetting({ flag: steerFlag, env: context.env });

  const sendNormal = async (reason?: string): Promise<SendSessionMessageResult> => {
    const response = await context.api.sendMessage(sessionId, { content, mode, executorType });
    return {
      message: response.message,
      steer: {
        requested: setting.requested,
        source: setting.source,
        effective: false,
        ...(setting.requested && reason !== undefined ? { reason } : {}),
      },
    };
  };

  if (!setting.requested) {
    return sendNormal();
  }

  const conflicting = [
    ...(mode !== undefined ? ['--mode'] : []),
    ...(executorType !== undefined ? ['--executor-type'] : []),
  ];
  if (conflicting.length > 0) {
    if (setting.source === 'flag') {
      throw new CliUsageError(`--steer cannot be combined with ${conflicting.join(' or ')}.`);
    }

    return sendNormal(`${conflicting.join(' or ')} cannot be combined with Steer`);
  }

  try {
    const response = await context.api.steerSession(sessionId, { content });
    const outcome = response.outcome === 'steered' ? 'steered' : 'queued';
    return {
      message: outcome === 'steered' ? 'Steered' : 'Queued',
      steer: {
        requested: true,
        source: setting.source,
        effective: true,
        outcome,
        ...(response.messageId !== undefined ? { messageId: response.messageId } : {}),
      },
    };
  } catch (error) {
    if (setting.source !== 'flag' && error instanceof ConnectError && error.code === Code.Unimplemented) {
      return sendNormal(STEER_UNSUPPORTED_REASON);
    }

    throw error;
  }
}

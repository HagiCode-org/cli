import type { Command } from 'commander';
import type { PCode_Web_Controllers_ScheduledPlanAgentPoolDto } from '../../generated/api/models/PCode_Web_Controllers_ScheduledPlanAgentPoolDto';
import type { PCode_Web_Controllers_ScheduledPlanSaveRequest } from '../../generated/api/models/PCode_Web_Controllers_ScheduledPlanSaveRequest';
import type { PCode_Web_Controllers_ScheduledPlanScheduleDto } from '../../generated/api/models/PCode_Web_Controllers_ScheduledPlanScheduleDto';
import { CliUsageError } from '../../runtime/errors';
import { loadStructuredJson } from '../../runtime/inputLoader';

export type PlanSaveRequest = PCode_Web_Controllers_ScheduledPlanSaveRequest;
export type PlanSchedule = PCode_Web_Controllers_ScheduledPlanScheduleDto;

/** Fields the backend owns. They are never sent back, so `get --json` output can be edited and reused. */
const SERVER_OWNED_FIELDS = ['id', 'createdAt', 'updatedAt', 'state', 'nextRunAt'] as const;

/** Scalar flag values that override fields of a plan document. Undefined means the flag was not passed. */
export type PlanFlagChanges = {
  name?: string;
  heroId?: string;
  enabled?: boolean;
};

/**
 * Loads a plan document from `--input <file>` or `--input -`. Missing, unreadable and non-object input are
 * usage errors, so none of them reaches the backend.
 */
export async function loadPlanDocument(source: string): Promise<Record<string, unknown>> {
  let loaded: unknown;
  try {
    loaded = await loadStructuredJson<unknown>(source);
  } catch (error) {
    if (error instanceof CliUsageError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new CliUsageError(`Cannot read plan input from ${source}: ${message}`);
  }

  if (!loaded || typeof loaded !== 'object' || Array.isArray(loaded)) {
    throw new CliUsageError(`Plan input from ${source} must be a JSON object.`);
  }

  return loaded as Record<string, unknown>;
}

/** Copy of a plan object without the backend-owned fields. */
export function stripServerFields(source: object): PlanSaveRequest {
  const saveRequest: Record<string, unknown> = { ...source };
  for (const field of SERVER_OWNED_FIELDS) {
    delete saveRequest[field];
  }

  return saveRequest as PlanSaveRequest;
}

/** The single-agent pool that `--hero-id` builds; `random` is the only strategy the backend accepts. */
export function buildAgentPool(heroId: string): PCode_Web_Controllers_ScheduledPlanAgentPoolDto {
  return {
    strategy: 'random',
    agents: [{ heroId }],
  };
}

/** Save-request fields set by scalar flags. Only the flags that were passed appear in the result. */
export function buildFlagChanges(flags: PlanFlagChanges): PlanSaveRequest {
  return {
    ...(flags.name !== undefined ? { name: flags.name } : {}),
    ...(flags.heroId !== undefined ? { agentPool: buildAgentPool(flags.heroId) } : {}),
    ...(flags.enabled !== undefined ? { enabled: flags.enabled } : {}),
  };
}

/**
 * Shallow merge on top-level save-request keys. A key present in `changes` replaces the current value as a
 * whole, so a partial `schedule` never merges into the old one and a field can be cleared with `null`.
 */
export function mergePlan(current: object, changes: object): PlanSaveRequest {
  return {
    ...stripServerFields(current),
    ...stripServerFields(changes),
  };
}

/** Schedule flag values as the command received them. Undefined means the flag was not passed. */
export type PlanScheduleFlags = {
  windowStart?: string;
  windowEnd?: string;
  firstAt?: string;
  every?: string;
  timeZone?: string;
};

/** Schedule flags after format checks. Instants keep the offset the user typed; the interval is whole minutes. */
export type ParsedPlanScheduleFlags = {
  windowStart?: string;
  windowEnd?: string;
  firstRunAt?: string;
  intervalMinutes?: number;
  timeZone?: string;
};

/** The four flags that make up an interval schedule, with the repeat field each one sets and its flag name. */
const INTERVAL_FIELDS = [
  { field: 'windowStart', flag: '--window-start' },
  { field: 'windowEnd', flag: '--window-end' },
  { field: 'firstRunAt', flag: '--first-at' },
  { field: 'intervalMinutes', flag: '--every' },
] as const;

const INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;
const DURATION_PATTERN = /^(\d+)([mhd])$/;
const MINUTES_PER_UNIT: Record<string, number> = { m: 1, h: 60, d: 1440 };
const MAX_INT32 = 2147483647;

/** Adds the five schedule flags to `plan create` or `plan update`. */
export function addPlanScheduleOptions(command: Command): Command {
  return command
    .option('--window-start <instant>', 'Interval window start, an ISO-8601 instant with a UTC offset (Z or +/-hh:mm), such as 2026-11-14T00:00-08:00. Sets an interval schedule.')
    .option('--window-end <instant>', 'Interval window end, same format. A trigger may fall exactly on the window end.')
    .option('--first-at <instant>', 'First trigger, same format. Must be at or after the window start and before the window end.')
    .option('--every <duration>', 'Interval between triggers: <n>m, <n>h or <n>d, such as 90m, 3h or 1d. Sent as whole minutes; the minimum is 5 minutes.')
    .option('--time-zone <iana>', 'IANA time zone of the schedule, such as Asia/Shanghai. Defaults to the document or plan, then to this machine.');
}

/** True when at least one schedule flag was passed. */
export function hasPlanScheduleFlags(flags: PlanScheduleFlags): boolean {
  return Object.values(flags).some(value => value !== undefined);
}

/** Time zone of the machine the CLI runs on. */
export function machineTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** Whether the calendar date and time fields of an instant exist. */
function isRealInstant(match: RegExpExecArray): boolean {
  const [, year, month, day, hour, minute, second = '0', , offset] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  const isRealDate = date.getUTCMonth() === Number(month) - 1 && date.getUTCDate() === Number(day);
  const offsetOk = offset === 'Z' || (Number(offset.slice(1, 3)) <= 23 && Number(offset.slice(4, 6)) <= 59);
  return isRealDate && Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59 && offsetOk;
}

/**
 * Checks an instant typed on the command line and returns it with seconds written out (the protobuf JSON
 * parser needs them). The offset the user typed is kept. A missing offset, or a value that is not a real date
 * and time, is a usage error. Backend order rules are not checked here.
 */
export function parseInstant(value: string, flag: string): string {
  const match = INSTANT_PATTERN.exec(value);
  if (!match || !isRealInstant(match)) {
    throw new CliUsageError(`${flag} must be an ISO-8601 instant with a UTC offset (Z or +/-hh:mm), such as 2026-11-14T00:00-08:00. Got "${value}".`);
  }

  const [, year, month, day, hour, minute, second = '00', fraction = '', offset] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${fraction}${offset}`;
}

/** Parses `<n>m`, `<n>h` or `<n>d` into whole minutes. A bare number has no unit and is rejected. */
export function parseDurationMinutes(value: string): number {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    throw new CliUsageError(`--every must be a whole number with a unit: <n>m, <n>h or <n>d, such as 90m, 3h or 1d. Got "${value}".`);
  }

  const minutes = Number(match[1]) * MINUTES_PER_UNIT[match[2]];
  if (!Number.isSafeInteger(minutes) || minutes > MAX_INT32) {
    throw new CliUsageError(`--every is too large: "${value}".`);
  }

  return minutes;
}

/** Format checks for every schedule flag that was passed. Runs before any backend call. */
export function parseScheduleFlags(flags: PlanScheduleFlags): ParsedPlanScheduleFlags {
  if (flags.timeZone !== undefined && flags.timeZone.trim() === '') {
    throw new CliUsageError('--time-zone must not be empty.');
  }

  return {
    ...(flags.windowStart !== undefined ? { windowStart: parseInstant(flags.windowStart, '--window-start') } : {}),
    ...(flags.windowEnd !== undefined ? { windowEnd: parseInstant(flags.windowEnd, '--window-end') } : {}),
    ...(flags.firstAt !== undefined ? { firstRunAt: parseInstant(flags.firstAt, '--first-at') } : {}),
    ...(flags.every !== undefined ? { intervalMinutes: parseDurationMinutes(flags.every) } : {}),
    ...(flags.timeZone !== undefined ? { timeZone: flags.timeZone.trim() } : {}),
  };
}

/**
 * The schedule the flags ask for, or undefined when no schedule flag was passed (the document or plan schedule
 * then stands). `base` is the schedule the save would otherwise carry: the document's on create, the document's
 * or else the current plan's on update.
 *
 * - Any interval flag makes an interval schedule. Its fields come from the flags first, then from a base that is
 *   already an interval; all four must be known, or the missing flags are named. The result has no start date,
 *   end date, time of day or weekdays.
 * - `--time-zone` alone changes the zone of the schedule the base already has.
 * - The zone defaults to the base's, then to this machine's.
 */
export function buildScheduleChange(flags: ParsedPlanScheduleFlags, base?: PlanSchedule): PlanSchedule | undefined {
  const touchesInterval = INTERVAL_FIELDS.some(({ field }) => flags[field] !== undefined);
  if (!touchesInterval && flags.timeZone === undefined) {
    return undefined;
  }

  const timeZone = flags.timeZone ?? base?.timeZone ?? machineTimeZone();
  const baseRepeat = base?.repeat?.rule === 'interval' ? base.repeat : undefined;
  if (!touchesInterval) {
    if (!base) {
      throw new CliUsageError(`--time-zone needs a schedule. Pass ${INTERVAL_FIELDS.map(({ flag }) => flag).join(', ')} or a document with a schedule.`);
    }
    if (baseRepeat) {
      return intervalSchedule(timeZone, baseRepeat);
    }
    return { ...base, timeZone };
  }

  const values = {
    windowStart: flags.windowStart ?? baseRepeat?.windowStart ?? undefined,
    windowEnd: flags.windowEnd ?? baseRepeat?.windowEnd ?? undefined,
    firstRunAt: flags.firstRunAt ?? baseRepeat?.firstRunAt ?? undefined,
    intervalMinutes: flags.intervalMinutes ?? baseRepeat?.intervalMinutes ?? undefined,
  };
  const missing = INTERVAL_FIELDS.filter(({ field }) => values[field] === undefined || values[field] === null);
  if (missing.length > 0) {
    throw new CliUsageError(`An interval schedule needs ${INTERVAL_FIELDS.map(({ flag }) => flag).join(', ')}. Missing: ${missing.map(({ flag }) => flag).join(', ')}.`);
  }

  return intervalSchedule(timeZone, values);
}

function intervalSchedule(timeZone: string, repeat: Omit<NonNullable<PlanSchedule['repeat']>, 'rule' | 'weekdays'>): PlanSchedule {
  return {
    mode: 'recurring',
    timeZone,
    repeat: {
      rule: 'interval',
      windowStart: repeat.windowStart,
      windowEnd: repeat.windowEnd,
      firstRunAt: repeat.firstRunAt,
      intervalMinutes: repeat.intervalMinutes,
    },
  };
}

import type { PCode_Web_Controllers_ScheduledPlanAgentPoolDto } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanAgentPoolDto';
import type { PCode_Web_Controllers_ScheduledPlanResponse } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanResponse';
import type { PCode_Web_Controllers_ScheduledPlanRunAcceptedDto } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanRunAcceptedDto';
import type { PCode_Web_Controllers_ScheduledPlanScheduleDto } from '../generated/api/models/PCode_Web_Controllers_ScheduledPlanScheduleDto';
import { renderKeyValueTable, renderTable } from './table';

export type PlanView = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  state: string;
  nextRunAt: string | null;
  schedule?: PCode_Web_Controllers_ScheduledPlanScheduleDto;
  agentPool?: PCode_Web_Controllers_ScheduledPlanAgentPoolDto;
  payload?: unknown;
};

export type PlanListPayload = {
  plans: PlanView[];
};

export type PlanDeletePayload = {
  planId: string;
  deleted: true;
};

export type PlanRunAcceptedPayload = {
  planId: string;
  accepted: true;
};

function optionalString(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Interval as the largest whole unit: `1d`, `3h`, `90m`. */
function formatIntervalMinutes(minutes: number): string {
  if (minutes % 1440 === 0) {
    return `${minutes / 1440}d`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}

/** An instant as wall-clock time `YYYY-MM-DD HH:mm` in the plan's zone. Falls back to the raw text. */
function formatInstantInZone(value: string, timeZone?: string): string {
  const date = new Date(value);
  if (!timeZone || Number.isNaN(date.getTime())) {
    return value;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const part = (type: string) => parts.find(entry => entry.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
  } catch {
    return value;
  }
}

/** `interval 3h 2026-11-14 00:00..2026-11-14 23:59 first 2026-11-14 00:00 America/Los_Angeles`, in the plan's zone. */
function summarizeIntervalSchedule(schedule: PCode_Web_Controllers_ScheduledPlanScheduleDto): string {
  const timeZone = optionalString(schedule.timeZone);
  const repeat = schedule.repeat;
  const windowStart = optionalString(repeat?.windowStart);
  const windowEnd = optionalString(repeat?.windowEnd);
  const firstRunAt = optionalString(repeat?.firstRunAt);
  const every = typeof repeat?.intervalMinutes === 'number' ? formatIntervalMinutes(repeat.intervalMinutes) : undefined;

  return [
    'interval',
    every,
    windowStart && windowEnd
      ? `${formatInstantInZone(windowStart, timeZone)}..${formatInstantInZone(windowEnd, timeZone)}`
      : undefined,
    firstRunAt ? `first ${formatInstantInZone(firstRunAt, timeZone)}` : undefined,
    timeZone,
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * One-line schedule label: `once <runAt>`, `daily HH:mm <zone>`, `weekly mon,fri HH:mm <zone>` or an interval
 * summary. Any other rule is shown as the backend sent it, so a new rule is never hidden.
 */
export function summarizePlanSchedule(schedule?: PCode_Web_Controllers_ScheduledPlanScheduleDto): string {
  if (!schedule) {
    return '';
  }

  const mode = optionalString(schedule.mode);
  if (mode === 'once') {
    return ['once', optionalString(schedule.runAt)].filter(Boolean).join(' ');
  }

  if (optionalString(schedule.repeat?.rule) === 'interval') {
    return summarizeIntervalSchedule(schedule);
  }

  const rule = optionalString(schedule.repeat?.rule) ?? mode ?? '';
  const weekdays = rule === 'weekly'
    ? (schedule.repeat?.weekdays ?? []).map(day => day.trim().slice(0, 3).toLowerCase()).join(',')
    : undefined;

  return [rule, weekdays, optionalString(schedule.timeOfDay), optionalString(schedule.timeZone)]
    .filter(Boolean)
    .join(' ');
}

export function toPlanView(plan: PCode_Web_Controllers_ScheduledPlanResponse): PlanView {
  return {
    id: optionalString(plan.id) ?? '',
    type: optionalString(plan.type) ?? '',
    name: optionalString(plan.name) ?? '',
    enabled: plan.enabled === true,
    state: optionalString(plan.state) ?? '',
    nextRunAt: optionalString(plan.nextRunAt) ?? null,
    schedule: plan.schedule,
    agentPool: plan.agentPool,
    payload: plan.payload,
  };
}

export function formatPlanListPayload(plans: PCode_Web_Controllers_ScheduledPlanResponse[]): PlanListPayload {
  return {
    plans: plans.map(toPlanView),
  };
}

export function formatPlanListHuman(plans: PlanView[]): string {
  if (plans.length === 0) {
    return 'No scheduled plans found.\n';
  }

  return `Plans (${plans.length})\n${renderTable(
    [
      { header: 'ID', value: plan => plan.id },
      { header: 'Type', value: plan => plan.type },
      { header: 'Name', value: plan => plan.name },
      { header: 'Enabled', value: plan => (plan.enabled ? 'yes' : 'no') },
      { header: 'State', value: plan => plan.state },
      { header: 'Next Run', value: plan => plan.nextRunAt ?? '-' },
      { header: 'Schedule', value: plan => summarizePlanSchedule(plan.schedule) },
    ],
    plans,
  )}\n`;
}

export function formatPlanSummaryHuman(plan: PlanView): string {
  return renderKeyValueTable([
    ['id', plan.id],
    ['type', plan.type],
    ['name', plan.name],
    ['enabled', plan.enabled ? 'yes' : 'no'],
    ['state', plan.state],
    ['nextRun', plan.nextRunAt ?? '-'],
    ['schedule', summarizePlanSchedule(plan.schedule)],
  ]);
}

export function formatPlanDeletePayload(planId: string): PlanDeletePayload {
  return { planId, deleted: true };
}

export function formatPlanDeleteHuman(payload: PlanDeletePayload): string {
  return `Plan deleted\n${renderKeyValueTable([
    ['planId', payload.planId],
    ['deleted', String(payload.deleted)],
  ])}`;
}

export function formatPlanRunAcceptedPayload(
  response: PCode_Web_Controllers_ScheduledPlanRunAcceptedDto,
): PlanRunAcceptedPayload {
  return {
    planId: optionalString(response.planId) ?? '',
    accepted: true,
  };
}

export function formatPlanRunAcceptedHuman(payload: PlanRunAcceptedPayload): string {
  return `Plan run accepted\n${renderKeyValueTable([
    ['planId', payload.planId],
    ['accepted', String(payload.accepted)],
  ])}`;
}

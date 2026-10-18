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

/**
 * One-line schedule label: `once <runAt>`, `daily HH:mm <zone>` or `weekly mon,fri HH:mm <zone>`.
 * Any other rule is shown as the backend sent it, so a new rule is never hidden.
 */
export function summarizePlanSchedule(schedule?: PCode_Web_Controllers_ScheduledPlanScheduleDto): string {
  if (!schedule) {
    return '';
  }

  const mode = optionalString(schedule.mode);
  if (mode === 'once') {
    return ['once', optionalString(schedule.runAt)].filter(Boolean).join(' ');
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

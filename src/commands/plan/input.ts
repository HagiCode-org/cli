import type { PCode_Web_Controllers_ScheduledPlanAgentPoolDto } from '../../generated/api/models/PCode_Web_Controllers_ScheduledPlanAgentPoolDto';
import type { PCode_Web_Controllers_ScheduledPlanSaveRequest } from '../../generated/api/models/PCode_Web_Controllers_ScheduledPlanSaveRequest';
import { CliUsageError } from '../../runtime/errors';
import { loadStructuredJson } from '../../runtime/inputLoader';

export type PlanSaveRequest = PCode_Web_Controllers_ScheduledPlanSaveRequest;

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

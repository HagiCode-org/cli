import { toPlanView, type PlanView } from '../../formatters/plan';
import type { CommandContext } from '../../runtime/commandContext';
import { mergePlan } from './input';

export type PlanToggleResult = {
  view: PlanView;
  /** False when the plan was already in the requested state, so no update was sent. */
  changed: boolean;
};

/**
 * Sets only the enabled flag. The current plan is read and sent back as a full replacement, and nothing is
 * sent when the plan already has that flag, so a no-op does not recompute the next run time.
 */
export async function setPlanEnabled(
  context: CommandContext,
  planId: string,
  enabled: boolean,
): Promise<PlanToggleResult> {
  const current = await context.api.getPlan(planId);
  if (toPlanView(current).enabled === enabled) {
    return { view: toPlanView(current), changed: false };
  }

  const updated = await context.api.updatePlan(planId, mergePlan(current, { enabled }));
  return { view: toPlanView(updated), changed: true };
}

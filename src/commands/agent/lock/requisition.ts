import type { Command } from 'commander';
import { formatLockStatusHuman } from '../../../formatters/lock';
import { formatJson } from '../../../formatters/json';
import { addJsonOption, createCommandContext, normalizeOptionalString, type AppDependencies } from '../../../runtime/commandContext';
import { CliUsageError } from '../../../runtime/errors';
import { addLockTargetOptions, guardLock, resolveLockTarget, type LockTargetOptions } from './options';

type LockRequisitionOptions = LockTargetOptions & { reason: string; label?: string; json?: boolean };

const MAX_REASON_LENGTH = 200;

export function registerLockRequisitionCommand(parent: Command, dependencies: AppDependencies): void {
  addLockTargetOptions(
    addJsonOption(
      parent
        .command('requisition')
        .description(
          'EMERGENCY: take the lock at once and displace the holder. Only when the user explicitly ordered a forced take; otherwise use acquire and queue.',
        ),
    ),
  )
    .requiredOption('--reason <text>', 'Why the lock is taken (1 to 200 characters). Quote the user\'s order; the displaced owner is told.')
    .option('--label <text>', 'Short label shown to others as the holder (at most 200 characters).')
    .action(async function lockRequisitionAction(this: Command, options: LockRequisitionOptions) {
      const reason = normalizeOptionalString(options.reason);
      if (!reason || reason.length > MAX_REASON_LENGTH) {
        throw new CliUsageError(`--reason must be 1 to ${MAX_REASON_LENGTH} characters.`);
      }

      const context = createCommandContext(this, dependencies);
      const target = resolveLockTarget(options, context.env);
      const status = await guardLock(() =>
        context.api.requisitionLock({ ...target, reason, label: normalizeOptionalString(options.label) }),
      );

      context.io.stdout(context.outputJson ? formatJson(status) : formatLockStatusHuman(status, 'requisition'));
    });
}

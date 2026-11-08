import type { Command } from 'commander';
import { formatLockStatusHuman } from '../../../formatters/lock';
import { formatJson } from '../../../formatters/json';
import { addJsonOption, createCommandContext, type AppDependencies } from '../../../runtime/commandContext';
import { CliLockLostError } from '../../../runtime/errors';
import { addLockTargetOptions, guardLock, parseEpoch, parseWholeSeconds, resolveLockTarget, type LockTargetOptions } from './options';

type LockRenewOptions = LockTargetOptions & { epoch?: string; leaseSeconds?: string; json?: boolean };

export function registerLockRenewCommand(parent: Command, dependencies: AppDependencies): void {
  addLockTargetOptions(
    addJsonOption(
      parent
        .command('renew')
        .description('Renew the lease once (one heartbeat). Exit code 32 when the lock is no longer yours. Prefer `heartbeat` for keeping a lock alive.'),
    ),
  )
    .option('--epoch <n>', 'Epoch of your grant, as printed by acquire. A stale epoch is refused.')
    .option('--lease-seconds <n>', 'Requested lease length in seconds (the backend clamps it to 30 to 600).')
    .action(async function lockRenewAction(this: Command, options: LockRenewOptions) {
      const epoch = parseEpoch(options.epoch);
      const leaseSeconds = parseWholeSeconds(options.leaseSeconds, '--lease-seconds', 1);
      const context = createCommandContext(this, dependencies);
      const target = resolveLockTarget(options, context.env);
      const status = await guardLock(() => context.api.renewLock({ ...target, epoch, leaseSeconds }));

      if (status.status !== 'Holding') {
        // A renew that is answered without a hold means the same as a refusal.
        context.io.stdout(context.outputJson ? formatJson(status) : formatLockStatusHuman(status, 'renew'));
        throw new CliLockLostError(`Owner ${target.ownerId} no longer holds lock ${target.lockId} (${status.status}).`, {
          reported: true,
        });
      }

      context.io.stdout(context.outputJson ? formatJson(status) : formatLockStatusHuman(status, 'renew'));
    });
}

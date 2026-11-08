import path from 'node:path';
import {
  acceptanceHashes,
  parseAcceptanceCommands,
  parseLock,
  parseOpenQuestions,
  parseProgressPlan,
  planItemsText,
  sha256,
  type ContractLock,
  type ProgressPlan,
} from './contract';
import { readSagaAmendments } from './read';
import { readContainedBytes, readContainedText } from './safeWrite';
import { methodDigests, METHOD_NAMES } from './methods';

export const ARTIFACT_FILES = ['goal.md', 'research.md', 'acceptance.md', 'progress.md'] as const;
/** A report that proves an item: a `Status: PASS` (or `状态: PASS`) line. */
export const PASS_REPORT_PATTERN = /^(状态|Status):\s*PASS\s*$/m;

export type CheckPhase = 'plan' | 'run';

/** Everything a check reads, loaded once so the rules see one consistent view of the Saga. */
export type SagaContractView = {
  sagaRoot: string;
  sagaId: string;
  directory: string;
  goal: Buffer | undefined;
  research: string | undefined;
  acceptance: string | undefined;
  progress: string | undefined;
  plan: ProgressPlan;
  commands: Record<string, string>;
};

export function loadContractView(sagaRoot: string, sagaId: string): SagaContractView {
  const directory = path.join(sagaRoot, sagaId);
  const progress = readContainedText(sagaRoot, path.join(directory, 'progress.md'));
  const acceptance = readContainedText(sagaRoot, path.join(directory, 'acceptance.md'));
  return {
    sagaRoot,
    sagaId,
    directory,
    goal: readContainedBytes(sagaRoot, path.join(directory, 'goal.md')),
    research: readContainedText(sagaRoot, path.join(directory, 'research.md')),
    acceptance,
    progress,
    plan: parseProgressPlan(progress ?? ''),
    commands: parseAcceptanceCommands(acceptance ?? ''),
  };
}

function isUnsafeId(id: string): boolean {
  return /[\\/]/.test(id) || id === '.' || id === '..';
}

/** Plan-phase rules: artifacts present, items present, one acceptance command per active item and no orphan entry. */
export function planErrors(view: SagaContractView): string[] {
  const errors: string[] = [];
  const present: Record<(typeof ARTIFACT_FILES)[number], boolean> = {
    'goal.md': view.goal !== undefined,
    'research.md': view.research !== undefined,
    'acceptance.md': view.acceptance !== undefined,
    'progress.md': view.progress !== undefined,
  };
  for (const name of ARTIFACT_FILES) {
    if (!present[name]) {
      errors.push(`${name} is missing`);
    }
  }
  const activeIds = view.plan.active.map(row => row.id);
  if (activeIds.length === 0 && present['progress.md']) {
    errors.push('progress.md has no active items');
  }
  if (new Set(activeIds).size !== activeIds.length) {
    errors.push('progress.md has duplicate item IDs');
  }
  for (const id of [...activeIds, ...view.plan.superseded.map(row => row.id)]) {
    if (isUnsafeId(id)) {
      errors.push(`unsafe item ID: ${id}`);
    }
  }
  for (const id of activeIds) {
    if (!(id in view.commands)) {
      errors.push(`item ${id} has no acceptance cmd in acceptance.md`);
    }
  }
  for (const id of Object.keys(view.commands)) {
    if (!activeIds.includes(id)) {
      errors.push(`acceptance entry ${id} is not an active item in progress.md`);
    }
  }
  return errors;
}

/** Current fingerprints of the frozen contract; the same keys and values that contract.lock records. */
export function currentHashes(view: SagaContractView): Record<string, string> {
  return {
    goal: sha256(view.goal ?? Buffer.alloc(0)),
    acceptance: sha256(view.acceptance !== undefined ? Buffer.from(view.acceptance, 'utf8') : Buffer.alloc(0)),
    'plan-items': sha256(planItemsText(view.plan)),
  };
}

export function openAmendmentErrors(view: SagaContractView): string[] {
  return readSagaAmendments(view.directory)
    .filter(amendment => !amendment.mergedIn)
    .map(amendment => `open amendment ${amendment.name}: merge it into the artifacts and set merged-in`);
}

export function openQuestionErrors(view: SagaContractView): string[] {
  return parseOpenQuestions(view.research ?? '')
    .map(question => `open question not decided by a human: ${question}`);
}

export function readFrozenLock(view: SagaContractView): { text: string; lock: ContractLock } | undefined {
  const text = readContainedText(view.sagaRoot, path.join(view.directory, 'contract.lock'));
  if (text === undefined) {
    return undefined;
  }
  return { text, lock: parseLock(text, path.join(view.directory, 'contract.lock')) };
}

/** Run-phase rules on top of the plan rules: frozen contract, amendments, questions and the proof of every ticked item. */
export function runPhaseErrors(view: SagaContractView): string[] {
  const errors: string[] = [];
  const frozen = readFrozenLock(view);
  if (!frozen) {
    errors.push('contract.lock missing: run freeze first');
  } else {
    const current = currentHashes(view);
    for (const [key, value] of Object.entries(current)) {
      if (frozen.lock.hashes[key] !== value) {
        errors.push(
          `hash mismatch for ${key}: frozen contract (r${frozen.lock.revision}) changed, run freeze after merging an amendment`,
        );
      }
    }
  }
  errors.push(...openAmendmentErrors(view));
  errors.push(...openQuestionErrors(view));
  errors.push(...tickProofErrors(view));
  return errors;
}

function tickProofErrors(view: SagaContractView): string[] {
  const errors: string[] = [];
  const runtimeDirectory = path.join(view.directory, 'runtime');
  for (const row of view.plan.active.filter(item => item.done)) {
    if (!row.note) {
      errors.push(`item ${row.id} is ticked but has no evidence reference`);
    } else {
      const evidence = path.resolve(runtimeDirectory, row.note);
      if (!evidence.startsWith(`${path.resolve(runtimeDirectory)}${path.sep}`)) {
        errors.push(`item ${row.id} evidence reference escapes the runtime directory: ${row.note}`);
      } else if (readContainedBytes(view.sagaRoot, evidence) === undefined) {
        errors.push(`item ${row.id} is ticked but evidence file is missing: ${row.note}`);
      }
    }
    const report = readContainedText(view.sagaRoot, path.join(runtimeDirectory, 'reports', `${row.id}.md`));
    if (report === undefined || !PASS_REPORT_PATTERN.test(report)) {
      errors.push(`item ${row.id} is ticked but its PASS report is missing`);
    }
  }
  return errors;
}

/** Everything `check --phase` reports, in a stable order. Pure: nothing is written. */
export function checkErrors(sagaRoot: string, sagaId: string, phase: CheckPhase): string[] {
  const view = loadContractView(sagaRoot, sagaId);
  const errors = planErrors(view);
  return phase === 'run' ? [...errors, ...runPhaseErrors(view)] : errors;
}

export type MethodDrift = {
  name: string;
  /** Digest recorded in the lock, or null when the lock has no entry for the method. */
  recorded: string | null;
  /** Digest of the method in the installed package. */
  current: string;
};

/** Method digests recorded in contract.lock against the installed package. Drift is a notice, never an error. */
export type MethodsReport = {
  recorded: boolean;
  drift: MethodDrift[];
};

/**
 * Compares the lock's `methods:` section with the installed methods. Undefined when no lock exists. A lock without the
 * section reports `recorded: false` with no drift.
 */
export function methodsReport(view: SagaContractView): MethodsReport | undefined {
  const frozen = readFrozenLock(view);
  if (!frozen) {
    return undefined;
  }
  const recorded = frozen.lock.methods;
  if (recorded === undefined) {
    return { recorded: false, drift: [] };
  }
  const current = methodDigests();
  const drift = METHOD_NAMES
    .filter(name => recorded[name] !== current[name])
    .map(name => ({ name, recorded: recorded[name] ?? null, current: current[name] }));
  return { recorded: true, drift };
}

/** The `check` result: plan or run errors, plus the method report for the run phase only. */
export function checkRun(sagaRoot: string, sagaId: string, phase: CheckPhase): { errors: string[]; methods?: MethodsReport } {
  const view = loadContractView(sagaRoot, sagaId);
  const errors = planErrors(view);
  if (phase === 'plan') {
    return { errors };
  }
  return { errors: [...errors, ...runPhaseErrors(view)], methods: methodsReport(view) };
}

/** Completion gate for `set-status done`: every active item verified and the run contract closed. */
export function completionErrors(sagaRoot: string, sagaId: string): string[] {
  const view = loadContractView(sagaRoot, sagaId);
  const active = view.plan.active;
  const allDone = active.length > 0 && active.every(row => row.done);
  return [
    ...(allDone ? [] : ['active items remain pending or blocked, or there are no active items']),
    ...checkErrors(sagaRoot, sagaId, 'run'),
  ];
}

/** Hash of the plan and acceptance inputs, for the freeze comparison. */
export function acceptanceFingerprints(view: SagaContractView): Record<string, string> {
  return acceptanceHashes(view.commands);
}

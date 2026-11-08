import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/** Writes a complete plan (goal, research, acceptance, two items with one command each) for Saga `id`. */
export function createPlannedSagaAt(sagaRoot: string, id = 'demo'): string {
  const directory = path.join(sagaRoot, id);
  mkdirSync(directory, { recursive: true });
  writeFileSync(path.join(directory, 'saga.json'), JSON.stringify({ id, createdAt: '2026-01-01T00:00:00Z', method: 1 }));
  writeFileSync(path.join(directory, 'goal.md'), '# Goal\n\nShip the change.\n');
  writeFileSync(path.join(directory, 'research.md'), '# Research\n\n## Open questions\n- none\n');
  writeFileSync(
    path.join(directory, 'acceptance.md'),
    '# Acceptance\n\n## T1\ncmd: node -e "process.exit(0)"\n\n## T2\ncmd: node -e "process.exit(0)"\n',
  );
  writeFileSync(path.join(directory, 'progress.md'), '# Plan\n\n- [ ] T1 First item |\n- [ ] T2 Second item |\n');
  return directory;
}

/** Relative path → bytes of every file under `root`; used to prove that a refused or check-only command wrote nothing. */
export function snapshotFiles(root: string): Record<string, string> {
  const files: Record<string, string> = {};
  const visit = (directory: string) => {
    for (const name of readdirSync(directory)) {
      const target = path.join(directory, name);
      if (statSync(target).isDirectory()) {
        visit(target);
      } else {
        files[path.relative(root, target)] = readFileSync(target).toString('base64');
      }
    }
  };
  visit(root);
  return files;
}

/** Stores a proof pair (evidence and PASS report) for one item under the Saga runtime directory. */
export function writeProof(directory: string, id: string, reportStatus = 'Status: PASS'): void {
  mkdirSync(path.join(directory, 'runtime', 'evidence'), { recursive: true });
  mkdirSync(path.join(directory, 'runtime', 'reports'), { recursive: true });
  writeFileSync(path.join(directory, 'runtime', 'evidence', `${id}.log`), 'exit 0\n');
  writeFileSync(path.join(directory, 'runtime', 'reports', `${id}.md`), `# ${id}\n\n${reportStatus}\n`);
}

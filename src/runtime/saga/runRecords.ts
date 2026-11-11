import path from 'node:path';
import { utcTimestamp } from './contract';
import { requireSagaDirectory } from './read';
import { appendContained, assertContained, ensureDirectory, ensureRuntimeIgnore, readContainedText } from './safeWrite';

/** One Worker record of `runtime/sessions.md`, as `session create` wrote it. */
export type WorkerRecord = {
  sessionId: string;
  createdAt: string;
  role: string;
  /** The item the Worker serves; null when the record holds `-`. */
  item: string | null;
  title: string;
};

/**
 * One record line: `- <session-id> | <UTC time> | <role> | <item or -> | <title>`. The item may not contain ` | `, which the
 * item rules never produce; the title takes the rest of the line.
 */
const RECORD_LINE = /^- (\S+) \| (\S+) \| (implementation|verification) \| (.+?) \| (.*)$/;

/**
 * Reads the Worker records of a Saga in file order. Lines that are not record lines are skipped. A Saga with no
 * `sessions.md` has no records. Reading is contained: a redirected path is refused before any byte is read.
 */
export function readWorkerRecords(sagaRoot: string, sagaId: string): WorkerRecord[] {
  const sagaDirectory = requireSagaDirectory(sagaRoot, sagaId);
  const text = readContainedText(sagaRoot, path.join(sagaDirectory, 'runtime', 'sessions.md'));
  if (text === undefined) {
    return [];
  }

  return text.split('\n').flatMap(line => {
    const match = RECORD_LINE.exec(line);
    if (!match) {
      return [];
    }
    return [{
      sessionId: match[1],
      createdAt: match[2],
      role: match[3],
      item: match[4] === '-' ? null : match[4],
      title: match[5],
    }];
  });
}

/** One orchestrator log line, `- <UTC time> | <message>`, with whitespace runs and line breaks collapsed to one space. */
export function formatOrchestratorLogLine(message: string, createdAt: string = utcTimestamp()): string {
  return `- ${createdAt} | ${message.replace(/\s+/g, ' ').trim()}\n`;
}

/**
 * Appends one line to `runtime/orchestrator-log.md`, creating `runtime/` and its ignore rule when missing. The target is
 * checked before the directory is created, so a redirected path leaves nothing behind. Earlier content is never rewritten.
 */
export function appendOrchestratorLogEntry(sagaRoot: string, sagaId: string, message: string): { line: string; path: string } {
  const sagaDirectory = requireSagaDirectory(sagaRoot, sagaId);
  const runtimeDirectory = path.join(sagaDirectory, 'runtime');
  const logPath = path.join(runtimeDirectory, 'orchestrator-log.md');
  assertContained(sagaRoot, logPath);
  ensureRuntimeIgnore(sagaRoot);
  ensureDirectory(sagaRoot, runtimeDirectory);

  const line = formatOrchestratorLogLine(message);
  appendContained(sagaRoot, logPath, line);
  return { line: line.trimEnd(), path: logPath };
}

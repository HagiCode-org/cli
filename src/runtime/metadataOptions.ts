import { readFileSync } from 'node:fs';
import type { Command } from 'commander';
import type { SessionMetadataMap } from './hagiApi';
import { CliUsageError } from './errors';

/**
 * The `--metadata` and `--metadata-json` options of `chat create` and `proposal create`. They are checked for syntax only:
 * the backend is the single authority for the key format, the value length and the entry count, and its message is shown
 * as it is. The help text states those limits.
 */

export type MetadataSources = {
  readFile: (path: string) => string;
  readStdin: () => string;
};

const defaultSources: MetadataSources = {
  readFile: path => readFileSync(path, 'utf8'),
  readStdin: () => readFileSync(0, 'utf8'),
};

/** Raw option values in the order given. `jsonSources` holds file paths, and `-` for stdin. */
export type MetadataInput = {
  entries?: readonly string[];
  jsonSources?: readonly string[];
};

const METADATA_HELP = [
  'Session metadata entry as key=value (repeatable). Split at the first "=", so a value may contain "=".',
  'Write-once and visible to every reader of the session: do not put secrets in it.',
].join(' ');

const METADATA_JSON_HELP = [
  'Read session metadata from a JSON object of string values, from a file or from stdin (-). Repeatable.',
  'Keys and values follow the same rules as --metadata.',
].join(' ');

/** The limits and an orchestration example, for the help of a command that takes the metadata options. */
function metadataLimitsHelp(commandName: string, requiredArgs: string): string {
  return [
    'Metadata limits (the backend checks them and reports a violation as an error):',
    '  - at most 16 entries in total;',
    '  - key: 1 to 64 characters matching ^[a-z][a-z0-9._-]{0,63}$ (lowercase letters, digits, "." "_" "-", starting with a letter);',
    '  - value: 1 to 512 characters, with no control characters;',
    '  - each key may appear once across --metadata and --metadata-json.',
    '',
    'The metadata is returned as userMetadata in --json output and is shown in the human output when present.',
    '',
    'Example (a master session and a worker session that carry role markers, the worker naming its master):',
    `  hagi ${commandName} ${requiredArgs} --metadata role=master --metadata batch=2026-11-07`,
    `  hagi ${commandName} ${requiredArgs} --metadata role=worker --metadata master=<master-session-id>`,
  ].join('\n');
}

/** Commander collector for a repeatable option. */
export function collectMetadataOption(value: string, previous?: string[]): string[] {
  return [...(previous ?? []), value];
}

/**
 * Registers `--metadata` and `--metadata-json`, and the limits in the command's help. `commandName` and `requiredArgs` shape
 * the example in that help.
 */
export function addMetadataOptions(command: Command, commandName: string, requiredArgs: string): Command {
  return command
    .option('--metadata <key=value>', METADATA_HELP, collectMetadataOption)
    .option('--metadata-json <file|->', METADATA_JSON_HELP, collectMetadataOption)
    .addHelpText('after', `\n${metadataLimitsHelp(commandName, requiredArgs)}\n`);
}

/** Splits one `key=value` at its first `=`. A missing `=` or an empty key is a usage error. */
export function parseMetadataEntry(entry: string): [string, string] {
  const separator = entry.indexOf('=');
  if (separator === -1) {
    throw new CliUsageError(`--metadata expects key=value, got "${entry}".`);
  }

  const key = entry.slice(0, separator);
  if (key === '') {
    throw new CliUsageError(`--metadata key is empty in "${entry}".`);
  }

  return [key, entry.slice(separator + 1)];
}

/** The end index of the JSON string that starts at `start` (the opening quote). `text` is valid JSON. */
function endOfJsonString(text: string, start: number): number {
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
    } else if (text[index] === '"') {
      return index;
    }
  }

  return text.length - 1;
}

/**
 * The keys of the root object of a JSON text, in order and with repeats. `JSON.parse` keeps only the last of two equal keys,
 * so the repeats are found here. `text` must already be valid JSON whose root is an object.
 */
export function topLevelJsonKeys(text: string): string[] {
  const keys: string[] = [];
  let depth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      const end = endOfJsonString(text, index);
      let next = end + 1;
      while (next < text.length && /\s/.test(text[next])) {
        next += 1;
      }
      if (depth === 1 && text[next] === ':') {
        keys.push(JSON.parse(text.slice(index, end + 1)) as string);
      }
      index = end;
    } else if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
    }
  }

  return keys;
}

function describeSource(source: string): string {
  return source === '-' ? 'stdin' : source;
}

/**
 * Parses the text of one `--metadata-json` source. Anything but an object of string values, and an empty key, is a usage
 * error. `keys` lists the root keys with repeats, so the caller can reject a key given twice in the same source.
 */
function parseMetadataJson(text: string, source: string): { entries: Array<[string, string]>; keys: string[] } {
  const label = describeSource(source);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliUsageError(`--metadata-json ${label} is not valid JSON: ${reason}`);
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new CliUsageError(`--metadata-json ${label} must be a JSON object of string values.`);
  }

  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (key === '') {
      throw new CliUsageError(`--metadata-json ${label} has an empty key.`);
    }
    if (typeof value !== 'string') {
      throw new CliUsageError(`--metadata-json ${label}: the value of "${key}" must be a string.`);
    }
    entries.push([key, value]);
  }

  return { entries, keys: topLevelJsonKeys(text) };
}

/**
 * Merges the `--metadata` entries and the `--metadata-json` sources into one map, or returns undefined when there are none.
 * A key that appears twice (within one source, or across sources) is a usage error, never a silent override.
 */
export function resolveMetadataOptions(
  input: MetadataInput,
  sources: MetadataSources = defaultSources,
): SessionMetadataMap | undefined {
  const merged = new Map<string, string>();
  const add = (key: string, value: string) => {
    if (merged.has(key)) {
      throw new CliUsageError(`Metadata key "${key}" is given more than once. Each key may appear once across --metadata and --metadata-json.`);
    }
    merged.set(key, value);
  };

  for (const entry of input.entries ?? []) {
    const [key, value] = parseMetadataEntry(entry);
    add(key, value);
  }

  for (const source of input.jsonSources ?? []) {
    const { entries, keys } = parseMetadataJson(readSource(source, sources), source);
    const seen = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) {
        throw new CliUsageError(`Metadata key "${key}" is given more than once in --metadata-json ${describeSource(source)}.`);
      }
      seen.add(key);
    }
    for (const [key, value] of entries) {
      add(key, value);
    }
  }

  return merged.size === 0 ? undefined : Object.fromEntries(merged);
}

/** The text of one source with any UTF-8 byte order mark removed. */
function readSource(source: string, sources: MetadataSources): string {
  let text: string;
  try {
    text = source === '-' ? sources.readStdin() : sources.readFile(source);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new CliUsageError(`Could not read --metadata-json ${describeSource(source)}: ${reason}`);
  }

  return text.replace(/^\uFEFF/, '');
}

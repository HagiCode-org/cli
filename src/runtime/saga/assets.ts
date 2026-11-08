import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { CliOperationFailedError } from '../errors';

/** Method names in the order the CLI lists them; each one is a bundled file at `prompts/<name>.md`. */
export const SAGA_METHOD_NAMES = ['goal', 'research', 'acceptance', 'plan', 'run', 'amend'] as const;

/** The only resource `init` installs into a project: the Saga ignore rule. */
const INSTALL_FILE = '.gitignore';

type SagaAssetManifest = {
  schemaVersion: 2;
  install: Record<string, string>;
  methods: Record<string, string>;
};

export type SagaAssets = {
  directory: string;
  /** Resources installed into `.hagicode/sagas/`, keyed by their path there. */
  install: ReadonlyMap<string, Buffer>;
  /** Published method bytes, keyed by method name. */
  methods: ReadonlyMap<string, Buffer>;
};

function defaultModuleUrl(): string {
  return typeof __filename === 'string' ? pathToFileURL(__filename).href : import.meta.url;
}

function findAssetDirectory(moduleUrl: string): string {
  let directory = path.dirname(fileURLToPath(moduleUrl));

  while (true) {
    const candidate = path.join(directory, 'resources', 'saga');
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    const parent = path.dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }

  throw new Error(`Unable to locate package resources/saga from ${moduleUrl}`);
}

function readRegularFile(filePath: string, description: string): Buffer {
  let stat: fs.Stats;
  try {
    stat = fs.lstatSync(filePath);
  } catch (error) {
    throw new CliOperationFailedError(
      `Unable to read ${description} at ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!stat.isFile()) {
    throw new CliOperationFailedError(`${description} is not a regular file: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

function requireExactKeys(value: unknown, expected: readonly string[], field: string, manifestPath: string): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliOperationFailedError(`Invalid Saga asset manifest at ${manifestPath}: ${field} must be an object`);
  }
  const entries = value as Record<string, unknown>;
  const keys = Object.keys(entries).sort();
  const wanted = [...expected].sort();
  if (keys.length !== wanted.length || keys.some((key, index) => key !== wanted[index])) {
    throw new CliOperationFailedError(
      `Invalid Saga asset manifest at ${manifestPath}: ${field} must list exactly ${expected.join(', ')}`,
    );
  }
  for (const key of keys) {
    if (typeof entries[key] !== 'string') {
      throw new CliOperationFailedError(`Invalid Saga asset manifest at ${manifestPath}: ${field}.${key} must be a digest`);
    }
  }
  return entries as Record<string, string>;
}

function parseManifest(bytes: Buffer, manifestPath: string): SagaAssetManifest {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new CliOperationFailedError(
      `Invalid Saga asset manifest at ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new CliOperationFailedError(`Invalid Saga asset manifest at ${manifestPath}: expected an object`);
  }

  const manifest = value as Record<string, unknown>;
  if (manifest.schemaVersion !== 2) {
    throw new CliOperationFailedError(`Unsupported Saga asset manifest schema at ${manifestPath}`);
  }
  return {
    schemaVersion: 2,
    install: requireExactKeys(manifest.install, [INSTALL_FILE], 'install', manifestPath),
    methods: requireExactKeys(manifest.methods, SAGA_METHOD_NAMES, 'methods', manifestPath),
  };
}

function verifiedBytes(directory: string, relativePath: string, expectedHash: string): Buffer {
  const bytes = readRegularFile(path.join(directory, ...relativePath.split('/')), `Saga asset ${relativePath}`);
  if (!/^[0-9a-f]{64}$/.test(expectedHash) || createHash('sha256').update(bytes).digest('hex') !== expectedHash) {
    throw new CliOperationFailedError(`Saga asset integrity check failed for ${relativePath}`);
  }
  return bytes;
}

/**
 * Loads and verifies every bundled Saga resource. Any missing, unreadable or mismatched file fails before the caller
 * receives any bytes, so a tampered package never yields content.
 */
export function loadSagaAssets(moduleUrl = defaultModuleUrl()): SagaAssets {
  const directory = findAssetDirectory(moduleUrl);
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = parseManifest(readRegularFile(manifestPath, 'Saga asset manifest'), manifestPath);

  const install = new Map<string, Buffer>();
  for (const [assetPath, expectedHash] of Object.entries(manifest.install)) {
    install.set(assetPath, verifiedBytes(directory, assetPath, expectedHash));
  }

  const methods = new Map<string, Buffer>();
  for (const name of SAGA_METHOD_NAMES) {
    methods.set(name, verifiedBytes(directory, `prompts/${name}.md`, manifest.methods[name]));
  }

  return { directory, install, methods };
}

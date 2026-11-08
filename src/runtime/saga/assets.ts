import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ASSET_PATHS = [
  '.gitignore',
  'prompts/acceptance.md',
  'prompts/amend.md',
  'prompts/goal.md',
  'prompts/plan.md',
  'prompts/research.md',
  'prompts/run.md',
];

type SagaAssetManifest = {
  schemaVersion: number;
  files: Record<string, string>;
};

export type SagaAssets = {
  directory: string;
  files: ReadonlyMap<string, Buffer>;
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
    throw new Error(`Unable to read ${description} at ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!stat.isFile()) {
    throw new Error(`${description} is not a regular file: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

function parseManifest(bytes: Buffer, manifestPath: string): SagaAssetManifest {
  let value: unknown;
  try {
    value = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid Saga asset manifest at ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Invalid Saga asset manifest at ${manifestPath}: expected an object`);
  }

  const manifest = value as Partial<SagaAssetManifest>;
  if (manifest.schemaVersion !== 1) {
    throw new Error(`Unsupported Saga asset manifest schema at ${manifestPath}`);
  }
  if (!manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files)) {
    throw new Error(`Invalid Saga asset manifest at ${manifestPath}: files must be an object`);
  }

  const paths = Object.keys(manifest.files).sort();
  if (paths.length !== ASSET_PATHS.length || paths.some((assetPath, index) => assetPath !== ASSET_PATHS[index])) {
    throw new Error(`Invalid Saga asset manifest at ${manifestPath}: expected exactly the seven managed assets`);
  }
  return manifest as SagaAssetManifest;
}

export function loadSagaAssets(moduleUrl = defaultModuleUrl()): SagaAssets {
  const directory = findAssetDirectory(moduleUrl);
  const manifestPath = path.join(directory, 'manifest.json');
  const manifest = parseManifest(readRegularFile(manifestPath, 'Saga asset manifest'), manifestPath);
  const files = new Map<string, Buffer>();

  for (const assetPath of ASSET_PATHS) {
    const bytes = readRegularFile(path.join(directory, assetPath), `Saga asset ${assetPath}`);
    const expectedHash = manifest.files[assetPath];
    if (!/^[0-9a-f]{64}$/.test(expectedHash) || createHash('sha256').update(bytes).digest('hex') !== expectedHash) {
      throw new Error(`Saga asset integrity check failed for ${assetPath}`);
    }
    files.set(assetPath, bytes);
  }

  return { directory, files };
}

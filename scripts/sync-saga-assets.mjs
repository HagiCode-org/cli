#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ASSETS = [
  ['prompts/acceptance.md', 'templates/saga/prompts/acceptance.md'],
  ['prompts/amend.md', 'templates/saga/prompts/amend.md'],
  ['prompts/goal.md', 'templates/saga/prompts/goal.md'],
  ['prompts/plan.md', 'templates/saga/prompts/plan.md'],
  ['prompts/research.md', 'templates/saga/prompts/research.md'],
  ['prompts/run.md', 'templates/saga/prompts/run.md'],
  ['tools/saga.mjs', 'scripts/saga.mjs'],
  ['.gitignore', 'templates/saga/gitignore'],
];
const MANIFEST_PATH = 'manifest.json';
const PACKAGE_IGNORE_PATH = '.npmignore';
const PACKAGE_IGNORE_BYTES = Buffer.from('!.gitignore\n');
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE_DIRECTORY = path.resolve(SCRIPT_DIRECTORY, '../resources/saga');

function parseArguments(args) {
  let skillDirectory;
  let check = false;

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--skill' && args[index + 1] && !args[index + 1].startsWith('--')) {
      skillDirectory = path.resolve(args[++index]);
    } else if (args[index] === '--check' && !check) {
      check = true;
    } else {
      throw new Error('Usage: node scripts/sync-saga-assets.mjs --skill <directory> [--check]');
    }
  }

  if (!skillDirectory) {
    throw new Error('Usage: node scripts/sync-saga-assets.mjs --skill <directory> [--check]');
  }
  return { check, skillDirectory };
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function readAssets(skillDirectory) {
  return ASSETS.map(([bundlePath, sourcePath]) => {
    const bytes = fs.readFileSync(path.join(skillDirectory, sourcePath));
    return { bundlePath, bytes };
  });
}

function listFiles(directory, prefix = '') {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(path.join(directory, prefix), { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.posix.join(prefix, entry.name);
    return entry.isDirectory() ? listFiles(directory, relativePath) : [relativePath];
  });
}

function createManifest(assets) {
  const files = Object.fromEntries(
    assets
      .map(({ bundlePath, bytes }) => [bundlePath, sha256(bytes)])
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
  );
  return Buffer.from(`${JSON.stringify({ schemaVersion: 1, files }, null, 2)}\n`);
}

function checkAssets(assets) {
  const problems = [];
  const expectedPaths = assets.map(({ bundlePath }) => bundlePath).sort();
  const actualPaths = listFiles(BUNDLE_DIRECTORY)
    .filter(file => file !== MANIFEST_PATH && file !== PACKAGE_IGNORE_PATH)
    .sort();

  for (const file of expectedPaths.filter(file => !actualPaths.includes(file))) {
    problems.push(`missing asset: ${file}`);
  }
  for (const file of actualPaths.filter(file => !expectedPaths.includes(file))) {
    problems.push(`unexpected asset: ${file}`);
  }

  for (const { bundlePath, bytes } of assets) {
    const target = path.join(BUNDLE_DIRECTORY, bundlePath);
    if (fs.existsSync(target) && !fs.readFileSync(target).equals(bytes)) {
      problems.push(`asset differs from source: ${bundlePath}`);
    }
  }

  const packageIgnorePath = path.join(BUNDLE_DIRECTORY, PACKAGE_IGNORE_PATH);
  if (!fs.existsSync(packageIgnorePath) || !fs.readFileSync(packageIgnorePath).equals(PACKAGE_IGNORE_BYTES)) {
    problems.push(`invalid package ignore file: ${PACKAGE_IGNORE_PATH}`);
  }

  const manifestFile = path.join(BUNDLE_DIRECTORY, MANIFEST_PATH);
  if (!fs.existsSync(manifestFile)) {
    problems.push(`missing manifest: ${MANIFEST_PATH}`);
  } else {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch (error) {
      problems.push(`invalid manifest: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (manifest !== undefined && (!manifest || typeof manifest !== 'object' || Array.isArray(manifest))) {
      problems.push('manifest must be an object');
    } else if (manifest !== undefined) {
      const expected = JSON.parse(createManifest(assets).toString('utf8'));
      if (manifest.schemaVersion !== expected.schemaVersion) {
        problems.push(`incorrect manifest schema version: ${String(manifest.schemaVersion)}`);
      }
      const actualHashes = manifest.files;
      if (!actualHashes || typeof actualHashes !== 'object' || Array.isArray(actualHashes)) {
        problems.push('manifest files must be an object');
      } else {
        for (const [file, hash] of Object.entries(expected.files)) {
          if (actualHashes[file] !== hash) {
            problems.push(`incorrect manifest hash for ${file}`);
          }
        }
        for (const file of Object.keys(actualHashes).filter(file => !Object.hasOwn(expected.files, file))) {
          problems.push(`unexpected manifest path: ${file}`);
        }
      }
      if (!fs.readFileSync(manifestFile).equals(createManifest(assets))) {
        problems.push('manifest is not in canonical sorted format');
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(problems.join('\n'));
  }
}

function writeIfChanged(filePath, bytes) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath).equals(bytes)) {
    return false;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, bytes);
  return true;
}

function synchronize(assets) {
  let changed = 0;
  for (const { bundlePath, bytes } of assets) {
    if (writeIfChanged(path.join(BUNDLE_DIRECTORY, bundlePath), bytes)) {
      changed += 1;
    }
  }
  if (writeIfChanged(path.join(BUNDLE_DIRECTORY, MANIFEST_PATH), createManifest(assets))) {
    changed += 1;
  }
  if (writeIfChanged(path.join(BUNDLE_DIRECTORY, PACKAGE_IGNORE_PATH), PACKAGE_IGNORE_BYTES)) {
    changed += 1;
  }
  process.stdout.write(`Synchronized ${assets.length} Saga assets (${changed} files changed).\n`);
}

function main() {
  const { check, skillDirectory } = parseArguments(process.argv.slice(2));
  const assets = readAssets(skillDirectory);
  if (check) {
    checkAssets(assets);
    process.stdout.write('Saga assets are synchronized.\n');
  } else {
    synchronize(assets);
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

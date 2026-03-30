#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const IMPLICIT_FILE_PATTERNS = [
  /^package\.json$/i,
  /^readme(?:\..+)?$/i,
  /^(?:license|licence|notice)(?:\..+)?$/i,
];

export function normalizePublishPath(filePath) {
  return String(filePath).replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

export function getRequiredPublishFiles(packageJson) {
  const requiredFiles = new Set(["README.md"]);
  const binField = packageJson.bin;

  if (typeof packageJson.main === "string" && packageJson.main.length > 0) {
    requiredFiles.add(normalizePublishPath(packageJson.main));
  }

  if (typeof binField === "string" && binField.length > 0) {
    requiredFiles.add(normalizePublishPath(binField));
  } else if (binField && typeof binField === "object") {
    for (const filePath of Object.values(binField)) {
      if (typeof filePath === "string" && filePath.length > 0) {
        requiredFiles.add(normalizePublishPath(filePath));
      }
    }
  }

  return [...requiredFiles];
}

export function getAllowedPublishEntries(packageJson) {
  const allowedEntries = new Set(getRequiredPublishFiles(packageJson));

  for (const filePath of packageJson.files ?? []) {
    if (typeof filePath === "string" && filePath.length > 0) {
      allowedEntries.add(normalizePublishPath(filePath));
    }
  }

  return [...allowedEntries];
}

export function isImplicitPackedFile(filePath) {
  const normalizedPath = normalizePublishPath(filePath);
  const baseName = path.posix.basename(normalizedPath);
  return IMPLICIT_FILE_PATTERNS.some(pattern => pattern.test(baseName));
}

export function inspectPackedFiles(packageJson, packedFiles) {
  const normalizedPackedFiles = [...new Set((packedFiles ?? []).map(normalizePublishPath))].sort();
  const requiredFiles = getRequiredPublishFiles(packageJson);
  const allowedEntries = getAllowedPublishEntries(packageJson);

  const missingFiles = requiredFiles.filter(filePath => !normalizedPackedFiles.includes(filePath));
  const unexpectedFiles = normalizedPackedFiles.filter(filePath => {
    if (isImplicitPackedFile(filePath)) {
      return false;
    }

    return !allowedEntries.some(allowedPath => {
      return filePath === allowedPath || filePath.startsWith(`${allowedPath}/`);
    });
  });

  return {
    allowedEntries,
    missingFiles,
    requiredFiles,
    unexpectedFiles,
  };
}

function requireManifestEntrypoints(packageJson, repoRoot) {
  const binField = packageJson.bin;
  const hasBinEntrypoint =
    typeof binField === "string"
      ? binField.length > 0
      : Boolean(binField && typeof binField === "object" && Object.keys(binField).length > 0);

  if (!hasBinEntrypoint) {
    throw new Error("package.json must define a bin entry before publishing.");
  }

  if (typeof packageJson.main !== "string" || packageJson.main.length === 0) {
    throw new Error("package.json must define main before publishing.");
  }

  for (const filePath of getRequiredPublishFiles(packageJson)) {
    if (!fs.existsSync(path.join(repoRoot, filePath))) {
      throw new Error(`Missing required publish file on disk: ${filePath}`);
    }
  }
}

function runNpmPack(repoRoot) {
  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const packOutput = execFileSync(npmCommand, ["pack", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const [packSummary] = JSON.parse(packOutput);

  if (!packSummary?.files) {
    throw new Error("npm pack did not return a file manifest to inspect.");
  }

  return packSummary;
}

export function verifyPackage({ repoRoot = ".", packSummary } = {}) {
  const resolvedRepoRoot = path.resolve(repoRoot);
  const packageJsonPath = path.join(resolvedRepoRoot, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

  requireManifestEntrypoints(packageJson, resolvedRepoRoot);

  const resolvedPackSummary = packSummary ?? runNpmPack(resolvedRepoRoot);
  const inspection = inspectPackedFiles(
    packageJson,
    resolvedPackSummary.files.map(file => file.path),
  );

  if (inspection.missingFiles.length > 0) {
    throw new Error(
      `npm pack is missing required publish files: ${inspection.missingFiles.join(", ")}`,
    );
  }

  if (inspection.unexpectedFiles.length > 0) {
    throw new Error(
      `npm pack included unexpected publish files: ${inspection.unexpectedFiles.join(", ")}`,
    );
  }

  return {
    inspection,
    packageJson,
    packSummary: resolvedPackSummary,
    repoRoot: resolvedRepoRoot,
  };
}

async function main() {
  const { inspection, packSummary } = verifyPackage({
    repoRoot: process.argv[2] ?? ".",
  });

  process.stdout.write(
    `Verified ${packSummary.name} with ${packSummary.files.length} packed files (${inspection.allowedEntries.join(", ")}).\n`,
  );
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;

if (entryPath === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

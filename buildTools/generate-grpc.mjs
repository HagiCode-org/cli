/**
 * gRPC client generator
 *
 * Generates the Connect-ES message and service stubs for the hagicode-core proto contracts into src/generated/grpc.
 * The output is committed, so a checkout builds and runs without this step. Run it only after a proto change.
 *
 * Proto source: HAGICODE_PROTO_DIR, or ../hagicode-core/protos by default. Generation runs in a temporary directory and
 * replaces src/generated/grpc only when buf succeeds, so a failed run leaves the committed output untouched.
 *
 * Commands (run from repos/cli):
 *   npm run generate:grpc         regenerate src/generated/grpc
 *   npm run generate:grpc:check   exit 1 and list the files that differ from a fresh generation
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const binDirectory = path.join(cliRoot, 'node_modules', '.bin')
const bufTemplate = path.join(cliRoot, 'buf.gen.yaml')
const outputDirectory = path.join(cliRoot, 'src', 'generated', 'grpc')
const defaultProtoDirectory = path.resolve(cliRoot, '..', 'hagicode-core', 'protos')
const checkMode = process.argv.includes('--check')

const fail = message => {
  console.error(message)
  process.exit(1)
}

const resolveProtoDirectory = () => {
  const protoDirectory = process.env.HAGICODE_PROTO_DIR
    ? path.resolve(process.env.HAGICODE_PROTO_DIR)
    : defaultProtoDirectory
  if (!fs.existsSync(protoDirectory)) {
    fail([
      `Proto directory not found: ${protoDirectory}`,
      'Set HAGICODE_PROTO_DIR to the hagicode-core protos directory (the one that contains buf.yaml).',
    ].join('\n'))
  }
  return protoDirectory
}

// Generates into `temporaryRoot` and returns the directory that holds the generated files.
const generate = (protoDirectory, temporaryRoot) => {
  const buf = path.join(binDirectory, process.platform === 'win32' ? 'buf.cmd' : 'buf')
  const result = spawnSync(buf, ['generate', protoDirectory, '--template', bufTemplate, '-o', temporaryRoot], {
    cwd: cliRoot,
    stdio: 'inherit',
    env: { ...process.env, PATH: `${binDirectory}${path.delimiter}${process.env.PATH ?? ''}` },
  })
  if (result.error) {
    fail(`Could not run buf (${buf}): ${result.error.message}`)
  }
  if (result.status !== 0) {
    fail(`buf generate failed for ${protoDirectory} (exit ${result.status}). The committed output was not changed.`)
  }
  const generatedDirectory = path.join(temporaryRoot, 'src', 'generated', 'grpc')
  if (!fs.existsSync(generatedDirectory)) {
    fail(`buf generate produced no output under ${generatedDirectory}`)
  }
  return generatedDirectory
}

const listFiles = (directory, prefix = '') => {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relative = path.join(prefix, entry.name)
    return entry.isDirectory() ? listFiles(path.join(directory, entry.name), relative) : [relative]
  }).sort()
}

const compareDirectories = (committedDirectory, freshDirectory) => {
  const committed = new Set(listFiles(committedDirectory))
  const fresh = new Set(listFiles(freshDirectory))
  const differing = []
  for (const file of new Set([...committed, ...fresh])) {
    if (!committed.has(file)) {
      differing.push(`${file} (missing from committed output)`)
    } else if (!fresh.has(file)) {
      differing.push(`${file} (no longer generated)`)
    } else if (!fs.readFileSync(path.join(committedDirectory, file)).equals(fs.readFileSync(path.join(freshDirectory, file)))) {
      differing.push(`${file} (content differs)`)
    }
  }
  return differing.sort()
}

// The copy is staged next to the target and then swapped, so an interrupted copy never leaves a half-written directory.
const replaceOutput = (generatedDirectory, targetDirectory) => {
  const stagingDirectory = path.join(path.dirname(targetDirectory), '.grpc-next')
  fs.rmSync(stagingDirectory, { recursive: true, force: true })
  fs.cpSync(generatedDirectory, stagingDirectory, { recursive: true })
  fs.rmSync(targetDirectory, { recursive: true, force: true })
  fs.renameSync(stagingDirectory, targetDirectory)
}

const main = () => {
  const protoDirectory = resolveProtoDirectory()
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'hagicode-cli-grpc-'))
  try {
    const generatedDirectory = generate(protoDirectory, temporaryRoot)

    if (checkMode) {
      const differing = compareDirectories(outputDirectory, generatedDirectory)
      if (differing.length > 0) {
        fail([
          'src/generated/grpc is out of date with the proto contracts:',
          ...differing.map(line => `  ${line}`),
          'Run `npm run generate:grpc` and commit the result.',
        ].join('\n'))
      }
      console.log('src/generated/grpc matches the proto contracts.')
      return
    }

    replaceOutput(generatedDirectory, outputDirectory)
    console.log(`Generated ${listFiles(outputDirectory).length} files into src/generated/grpc from ${protoDirectory}`)
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true })
  }
}

main()

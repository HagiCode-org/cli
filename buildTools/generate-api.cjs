const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { loadOpenApiConfig, configPath, workspaceRoot } = require('./openapi-config.cjs')

const config = loadOpenApiConfig()
const cli = path.resolve(
  workspaceRoot,
  'node_modules/.bin',
  process.platform === 'win32' ? 'openapi.cmd' : 'openapi'
)

const args = [
  '--input', config.swaggerUrl,
  '--output', config.outputDir,
  '--client', config.httpClient,
]

if (config.clientName) args.push('--name', config.clientName)
if (config.useOptions) args.push('--useOptions')
if (config.useUnionTypes) args.push('--useUnionTypes')

for (const [flag, value] of [
  ['--exportCore', config.exportCore],
  ['--exportServices', config.exportServices],
  ['--exportModels', config.exportModels],
  ['--exportSchemas', config.exportSchemas],
]) {
  if (typeof value === 'boolean') {
    args.push(flag, String(value))
  }
}

if (config.indent) args.push('--indent', config.indent)
if (config.postfixServices) args.push('--postfixServices', config.postfixServices)
if (config.postfixModels) args.push('--postfixModels', config.postfixModels)
if (config.request) args.push('--request', config.request)

console.log(`[generate:api] Using config ${configPath}`)
console.log(`[generate:api] Swagger input ${config.swaggerUrl}`)
console.log(`[generate:api] Output directory ${config.outputDir}`)

fs.rmSync(config.outputPath, { recursive: true, force: true })

const result = spawnSync(cli, args, {
  cwd: workspaceRoot,
  stdio: 'inherit',
})

process.exit(result.status ?? 1)

const fs = require('fs')
const path = require('path')

const workspaceRoot = path.resolve(__dirname, '..')
const configPath = path.resolve(workspaceRoot, 'openapi-ts.config.json')

function loadOpenApiConfig() {
  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  const swaggerUrl = rawConfig.swaggerUrl ?? rawConfig.input
  const outputDir = rawConfig.outputDir ?? rawConfig.output

  if (!swaggerUrl) {
    throw new Error(`Missing Swagger URL in ${configPath}. Expected "swaggerUrl".`)
  }

  if (!outputDir) {
    throw new Error(`Missing output directory in ${configPath}. Expected "outputDir".`)
  }

  return {
    ...rawConfig,
    swaggerUrl,
    outputDir,
    outputPath: path.resolve(workspaceRoot, outputDir),
  }
}

module.exports = {
  configPath,
  loadOpenApiConfig,
  workspaceRoot,
}
